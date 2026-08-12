import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../common/errors/error-code';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaymentReviewDto,
  PaymentReviewListDto,
} from './dto/payment-review.dto';
import {
  ListPaymentReviewsQueryDto,
  REVIEW_STATUSES,
} from './dto/list-payment-reviews-query.dto';
import { ResolvePaymentDto } from './dto/resolve-payment.dto';

const reviewSelect = {
  id: true,
  sepayTxnId: true,
  status: true,
  amountVnd: true,
  transferContent: true,
  reviewReason: true,
  receivedAt: true,
  reviewedAt: true,
  adminNote: true,
  reviewedBy: { select: { fullName: true } },
  order: {
    select: {
      id: true,
      status: true,
      totalVnd: true,
      transferCode: true,
      expiresAt: true,
      event: { select: { id: true, title: true } },
      buyer: { select: { fullName: true, email: true } },
    },
  },
} satisfies Prisma.PaymentSelect;

type ReviewRow = Prisma.PaymentGetPayload<{ select: typeof reviewSelect }>;

/**
 * The manual reconciliation queue for money the webhook could not turn into
 * tickets. The platform never moves money, so an admin settles the case outside
 * the system and records what happened here.
 */
@Injectable()
export class PaymentReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentReviewsService.name);
  }

  async list(query: ListPaymentReviewsQueryDto): Promise<PaymentReviewListDto> {
    /*
     * Mặc định chỉ lấy các Payment status cần con người đối soát. `resolved`
     * được biểu diễn bằng reviewedAt thay vì một status thanh toán mới: status
     * nói tiền match thế nào, reviewedAt nói Admin đã xử lý case hay chưa.
     */
    const where: Prisma.PaymentWhereInput = {
      status: query.status ? query.status : { in: [...REVIEW_STATUSES] },
      reviewedAt: query.resolved ? { not: null } : null,
    };
    const skip = (query.page - 1) * query.limit;

    /*
     * total đi theo bộ lọc hiện tại để phân trang; openCount luôn đếm toàn bộ
     * case chưa xử lý để UI hiển thị badge, bất kể trang/filter đang xem.
     */
    const [rows, total, openCount] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        select: reviewSelect,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({
        where: { status: { in: [...REVIEW_STATUSES] }, reviewedAt: null },
      }),
    ]);

    return {
      items: rows.map(toPaymentReviewDto),
      total,
      openCount,
      page: query.page,
      limit: query.limit,
    };
  }

  async resolve(
    adminId: string,
    id: string,
    dto: ResolvePaymentDto,
  ): Promise<PaymentReviewDto> {
    const payment = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id },
        select: { status: true, reviewedAt: true },
      });
      if (
        !existing ||
        !REVIEW_STATUSES.some((status) => status === existing.status)
      ) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Payment review not found.',
        });
      }

      /*
       * CAS trên reviewedAt = null đảm bảo hai Admin không cùng resolve một case.
       * Service chỉ ghi nhận người/thời gian/note; việc hoàn tiền hay điều chỉnh
       * thực tế diễn ra ngoài nền tảng và không tự phát hành Ticket ở đây.
       */
      const changed = await tx.payment.updateMany({
        where: { id, reviewedAt: null },
        data: {
          reviewedAt: new Date(),
          reviewedById: adminId,
          adminNote: dto.note,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'This payment has already been reviewed.',
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id },
        select: reviewSelect,
      });
    });

    this.logger.info(
      { adminId, paymentId: id },
      'Admin resolved a payment review',
    );
    return toPaymentReviewDto(payment);
  }
}

function toPaymentReviewDto(row: ReviewRow): PaymentReviewDto {
  return {
    id: row.id,
    sepayTxnId: row.sepayTxnId,
    status: row.status,
    amountVnd: Number(row.amountVnd),
    transferContent: row.transferContent,
    reviewReason: row.reviewReason,
    receivedAt: row.receivedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByName: row.reviewedBy?.fullName ?? null,
    adminNote: row.adminNote,
    order: row.order
      ? {
          id: row.order.id,
          status: row.order.status,
          totalVnd: Number(row.order.totalVnd),
          transferCode: row.order.transferCode,
          eventId: row.order.event.id,
          eventTitle: row.order.event.title,
          buyerName: row.order.buyer.fullName,
          buyerEmail: row.order.buyer.email,
          expiresAt: row.order.expiresAt.toISOString(),
        }
      : null,
  };
}
