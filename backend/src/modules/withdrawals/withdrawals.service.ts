import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../common/errors/error-code';
import { OrderStatus, Prisma, WithdrawalStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ListAdminWithdrawalsQueryDto } from './dto/list-admin-withdrawals-query.dto';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals-query.dto';
import { MarkWithdrawalPaidDto } from './dto/mark-withdrawal-paid.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { WithdrawalBalanceDto } from './dto/withdrawal-balance.dto';
import { WithdrawalDto, WithdrawalListDto } from './dto/withdrawal.dto';

const withdrawalSelect = {
  id: true,
  organizerId: true,
  amountVnd: true,
  status: true,
  bankName: true,
  bankAccountNumber: true,
  bankAccountHolder: true,
  organizerNote: true,
  rejectionReason: true,
  transferReference: true,
  adminNote: true,
  reviewedAt: true,
  paidAt: true,
  createdAt: true,
  organizer: { select: { fullName: true, email: true } },
} satisfies Prisma.WithdrawalRequestSelect;

type WithdrawalRow = Prisma.WithdrawalRequestGetPayload<{
  select: typeof withdrawalSelect;
}>;

/**
 * Statuses that still owe the organizer money, so their amounts stay reserved
 * against the balance until the request either settles or is dropped.
 */
const OPEN_STATUSES: WithdrawalStatus[] = [
  WithdrawalStatus.PENDING,
  WithdrawalStatus.APPROVED,
];

const ALLOWED_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  PENDING: [
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.REJECTED,
    WithdrawalStatus.CANCELLED,
  ],
  // A manual bank transfer can fail after approval, so rejection stays open.
  APPROVED: [WithdrawalStatus.PAID, WithdrawalStatus.REJECTED],
  PAID: [],
  REJECTED: [],
  CANCELLED: [],
};

/** The three outcomes an admin can record. */
type ReviewedStatus =
  | typeof WithdrawalStatus.APPROVED
  | typeof WithdrawalStatus.REJECTED
  | typeof WithdrawalStatus.PAID;

const NOTIFICATION_BY_STATUS = {
  [WithdrawalStatus.APPROVED]: 'WITHDRAWAL_APPROVED',
  [WithdrawalStatus.REJECTED]: 'WITHDRAWAL_REJECTED',
  [WithdrawalStatus.PAID]: 'WITHDRAWAL_PAID',
} as const satisfies Record<ReviewedStatus, string>;

/**
 * Guards the withdrawal lifecycle. Only the edges in ALLOWED_TRANSITIONS are
 * legal; every other move is a client error.
 */
export function assertWithdrawalTransition(
  from: WithdrawalStatus,
  to: WithdrawalStatus,
): void {
  // Domain guard: chỉ các cạnh khai báo trong ALLOWED_TRANSITIONS được phép.
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException({
      code: ErrorCode.INVALID_STATE_TRANSITION,
      message: `Cannot move a withdrawal request from ${from} to ${to}.`,
    });
  }
}

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WithdrawalsService.name);
  }

  async getBalance(organizerId: string): Promise<WithdrawalBalanceDto> {
    const balance = await this.readBalance(this.prisma, organizerId);

    return {
      settledRevenueVnd: Number(balance.settledRevenueVnd),
      pendingVnd: Number(balance.pendingVnd),
      withdrawnVnd: Number(balance.withdrawnVnd),
      availableVnd: Number(balance.availableVnd),
      minAmountVnd: this.minAmountVnd(),
    };
  }

  async listForOrganizer(
    organizerId: string,
    query: ListWithdrawalsQueryDto,
  ): Promise<WithdrawalListDto> {
    const where: Prisma.WithdrawalRequestWhereInput = {
      organizerId,
      ...(query.status ? { status: query.status } : {}),
    };

    return this.paginate(where, query.page, query.limit);
  }

  async listForAdmin(
    query: ListAdminWithdrawalsQueryDto,
  ): Promise<WithdrawalListDto> {
    const search = query.search?.trim();
    const where: Prisma.WithdrawalRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            organizer: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    return this.paginate(where, query.page, query.limit);
  }

  /**
   * Concurrent submissions from the same organizer serialize on a `FOR UPDATE`
   * lock of their User row, so the balance check always sees every committed
   * request and the one-open-request rule cannot be raced.
   */
  async create(
    organizerId: string,
    dto: CreateWithdrawalDto,
  ): Promise<WithdrawalDto> {
    const minAmountVnd = this.minAmountVnd();
    const amountVnd = BigInt(dto.amountVnd);

    const created = await this.prisma.$transaction(async (tx) => {
      /*
       * Khóa User của Organizer để hai request rút tiền cùng tài khoản chạy lần
       * lượt. Nếu không, cả hai có thể cùng thấy không có request mở và cùng đọc
       * một available balance, rồi tổng số yêu cầu vượt quá doanh thu.
       */
      await tx.$queryRaw`
        SELECT id FROM "User" WHERE id = ${organizerId}::uuid FOR UPDATE
      `;

      /*
       * PENDING và APPROVED đều là nghĩa vụ tiền chưa kết thúc, nên chỉ cho một
       * request thuộc hai trạng thái này. REJECTED/CANCELLED đã giải phóng số dư;
       * PAID đã được trừ riêng trong withdrawn.
       */
      const open = await tx.withdrawalRequest.count({
        where: { organizerId, status: { in: OPEN_STATUSES } },
      });
      if (open > 0) {
        throw new ConflictException({
          code: ErrorCode.WITHDRAWAL_REQUEST_ALREADY_OPEN,
          message: 'A withdrawal request is already being processed.',
        });
      }

      if (amountVnd < BigInt(minAmountVnd)) {
        throw new BadRequestException({
          code: ErrorCode.WITHDRAWAL_AMOUNT_TOO_SMALL,
          message: `The smallest withdrawal is ${minAmountVnd} VND.`,
        });
      }

      // Tính lại trong transaction, không tin số dư từng hiển thị trước đó ở app.
      const balance = await this.readBalance(tx, organizerId);
      if (amountVnd > balance.availableVnd) {
        throw new ConflictException({
          code: ErrorCode.WITHDRAWAL_AMOUNT_EXCEEDS_BALANCE,
          message: 'The requested amount is above the available balance.',
        });
      }

      const request = await tx.withdrawalRequest.create({
        data: {
          organizerId,
          amountVnd,
          bankName: dto.bankName,
          bankAccountNumber: dto.bankAccountNumber,
          bankAccountHolder: dto.bankAccountHolder,
          organizerNote: dto.organizerNote ?? null,
        },
        select: withdrawalSelect,
      });

      /*
       * Yêu cầu rút và thông báo Admin commit cùng nhau. Nếu transaction rollback,
       * không có notification mồ côi trỏ tới withdrawal không tồn tại.
       */
      const admins = await tx.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'WITHDRAWAL_SUBMITTED' as const,
            data: {
              withdrawalId: request.id,
              organizerId,
              organizerName: request.organizer.fullName,
              amountVnd: Number(request.amountVnd),
              url: '/admin/withdrawals?status=PENDING',
            },
          })),
        });
      }

      return request;
    });

    this.logger.info(
      { organizerId, withdrawalId: created.id, amountVnd: dto.amountVnd },
      'Organizer submitted withdrawal request',
    );
    return toWithdrawalDto(created);
  }

  async cancel(organizerId: string, id: string): Promise<WithdrawalDto> {
    const request = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findFirst({
        where: { id, organizerId },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Withdrawal request not found.',
        });
      }

      assertWithdrawalTransition(existing.status, WithdrawalStatus.CANCELLED);
      /*
       * CAS chỉ cancel khi request vẫn PENDING và thuộc Organizer. Nếu Admin vừa
       * approve, count = 0 và Organizer không thể ghi đè quyết định đó.
       */
      const changed = await tx.withdrawalRequest.updateMany({
        where: { id, organizerId, status: WithdrawalStatus.PENDING },
        data: { status: WithdrawalStatus.CANCELLED },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'The withdrawal request is no longer waiting for review.',
        });
      }

      return tx.withdrawalRequest.findUniqueOrThrow({
        where: { id },
        select: withdrawalSelect,
      });
    });

    this.logger.info(
      { organizerId, withdrawalId: id },
      'Organizer cancelled withdrawal request',
    );
    return toWithdrawalDto(request);
  }

  async approve(adminId: string, id: string): Promise<WithdrawalDto> {
    const request = await this.review(id, WithdrawalStatus.APPROVED, {
      reviewedById: adminId,
      reviewedAt: new Date(),
    });

    this.logger.info(
      { adminId, withdrawalId: id },
      'Admin approved withdrawal request',
    );
    return request;
  }

  async reject(
    adminId: string,
    id: string,
    dto: RejectWithdrawalDto,
  ): Promise<WithdrawalDto> {
    const request = await this.review(id, WithdrawalStatus.REJECTED, {
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: dto.reason,
    });

    this.logger.info(
      { adminId, withdrawalId: id },
      'Admin rejected withdrawal request',
    );
    return request;
  }

  async markPaid(
    adminId: string,
    id: string,
    dto: MarkWithdrawalPaidDto,
  ): Promise<WithdrawalDto> {
    const request = await this.review(id, WithdrawalStatus.PAID, {
      paidAt: new Date(),
      transferReference: dto.transferReference ?? null,
      adminNote: dto.adminNote ?? null,
    });

    this.logger.info(
      { adminId, withdrawalId: id },
      'Admin marked withdrawal request as paid',
    );
    return request;
  }

  /**
   * Shared admin transition: lock nothing, but only apply the update when the
   * row is still in the status the decision was made against.
   */
  private async review(
    id: string,
    next: ReviewedStatus,
    data: Prisma.WithdrawalRequestUncheckedUpdateManyInput,
  ): Promise<WithdrawalDto> {
    const request = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findUnique({
        where: { id },
        select: { organizerId: true, amountVnd: true, status: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Withdrawal request not found.',
        });
      }

      assertWithdrawalTransition(existing.status, next);
      /*
       * So sánh status đã đọc trong WHERE. Hai Admin có thể cùng mở một request,
       * nhưng chỉ người update trước thắng; người còn lại nhận conflict thay vì
       * thay đổi kết quả đã được xử lý.
       */
      const changed = await tx.withdrawalRequest.updateMany({
        where: { id, status: existing.status },
        data: { ...data, status: next },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'The withdrawal request was already processed.',
        });
      }

      // Notification dùng trạng thái `next` để chọn đúng loại cho Organizer.
      await tx.notification.create({
        data: {
          userId: existing.organizerId,
          type: NOTIFICATION_BY_STATUS[next],
          data: {
            withdrawalId: id,
            amountVnd: Number(existing.amountVnd),
            ...(typeof data.rejectionReason === 'string'
              ? { reason: data.rejectionReason }
              : {}),
            url: '/organizer/withdrawals',
          },
        },
      });

      return tx.withdrawalRequest.findUniqueOrThrow({
        where: { id },
        select: withdrawalSelect,
      });
    });

    return toWithdrawalDto(request);
  }

  private async paginate(
    where: Prisma.WithdrawalRequestWhereInput,
    page: number,
    limit: number,
  ): Promise<WithdrawalListDto> {
    const skip = (page - 1) * limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        select: withdrawalSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { items: rows.map(toWithdrawalDto), total, page, limit };
  }

  /**
   * Only revenue from events that have already ended is withdrawable, so an
   * organizer cannot cash out money that may still be refunded or cancelled.
   */
  private async readBalance(
    client: Prisma.TransactionClient | PrismaService,
    organizerId: string,
  ): Promise<{
    settledRevenueVnd: bigint;
    pendingVnd: bigint;
    withdrawnVnd: bigint;
    availableVnd: bigint;
  }> {
    /*
     * Chỉ Order PAID của Event đã kết thúc được xem là settled revenue. Tiền của
     * event tương lai chưa cho rút vì vẫn còn rủi ro hủy/hoàn. Ba aggregate độc
     * lập chạy song song trên cùng transaction client khi được gọi từ create().
     */
    const [settled, pending, withdrawn] = await Promise.all([
      client.order.aggregate({
        where: {
          status: OrderStatus.PAID,
          event: { organizerId, endAt: { lt: new Date() } },
        },
        _sum: { totalVnd: true },
      }),
      client.withdrawalRequest.aggregate({
        where: { organizerId, status: { in: OPEN_STATUSES } },
        _sum: { amountVnd: true },
      }),
      client.withdrawalRequest.aggregate({
        where: { organizerId, status: WithdrawalStatus.PAID },
        _sum: { amountVnd: true },
      }),
    ]);

    const settledRevenueVnd = settled._sum.totalVnd ?? 0n;
    const pendingVnd = pending._sum.amountVnd ?? 0n;
    const withdrawnVnd = withdrawn._sum.amountVnd ?? 0n;
    /*
     * Giữ toàn bộ phép tính ở bigint. max với 0 tránh trả số âm nếu dữ liệu lịch
     * sử bất nhất; nó không thay thế các validation khi tạo withdrawal.
     */
    const remaining = settledRevenueVnd - pendingVnd - withdrawnVnd;

    return {
      settledRevenueVnd,
      pendingVnd,
      withdrawnVnd,
      availableVnd: remaining > 0n ? remaining : 0n,
    };
  }

  private minAmountVnd(): number {
    return this.config.get<number>('withdrawal.minAmountVnd') ?? 0;
  }
}

function toWithdrawalDto(row: WithdrawalRow): WithdrawalDto {
  return {
    id: row.id,
    organizerId: row.organizerId,
    organizerName: row.organizer.fullName,
    organizerEmail: row.organizer.email,
    amountVnd: Number(row.amountVnd),
    status: row.status,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolder: row.bankAccountHolder,
    organizerNote: row.organizerNote,
    rejectionReason: row.rejectionReason,
    transferReference: row.transferReference,
    adminNote: row.adminNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
