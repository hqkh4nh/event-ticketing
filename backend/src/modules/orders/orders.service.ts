import { randomInt } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '../../common/errors/error-code';
import { Order, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketEmailService } from '../mail/ticket-email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto, PaymentInfoDto } from './dto/order-response.dto';

const orderDetailsInclude = {
  event: {
    select: { id: true, title: true, venue: true, startAt: true },
  },
  items: {
    include: {
      ticketType: { select: { name: true } },
      tickets: { orderBy: { sequence: 'asc' as const } },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderDetailsInclude;
}>;

const MAX_PENDING_ORDERS_PER_BUYER = 3;
const TRANSFER_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TRANSFER_CODE_LENGTH = 8;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
    private readonly ticketEmail: TicketEmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates a free order and issues its tickets in one transaction. Concurrent
   * orders for the same ticket type serialize on a `FOR UPDATE` row lock, so the
   * availability check always sees committed reservations and never oversells.
   */
  async create(
    buyerId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    /*
     * Client có thể vô tình gửi cùng một ticketTypeId nhiều lần. Map gộp các
     * dòng đó trước khi kiểm tra tồn kho và tạo OrderItem. Ngoài việc làm phép
     * tính chính xác, bước này còn tuân theo unique constraint
     * [orderId, ticketTypeId]: mỗi hạng vé chỉ có đúng một dòng trong đơn.
     */
    const wanted = new Map<string, number>();
    for (const item of dto.items) {
      wanted.set(
        item.ticketTypeId,
        (wanted.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }
    const ticketTypeIds = [...wanted.keys()];

    const created = await this.prisma.$transaction(async (tx) => {
      /*
       * Khóa row User để tuần tự hóa các request đặt vé của cùng một buyer.
       * Nếu không khóa, hai request đồng thời có thể cùng đếm được 2 đơn
       * PENDING rồi cùng tạo thêm, làm vượt giới hạn 3 đơn. Lock này chỉ chặn
       * request của cùng buyer; buyer khác vẫn đặt vé bình thường.
       */
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${buyerId}::uuid FOR UPDATE`;

      if (dto.clientRequestId) {
        /*
         * clientRequestId là idempotency key do app sinh cho một lần bấm đặt
         * vé. Khi mạng timeout và app retry, service trả lại Order đã tạo thay
         * vì tạo đơn và phát hành vé lần hai.
         */
        const existing = await tx.order.findUnique({
          where: {
            buyerId_clientRequestId: {
              buyerId,
              clientRequestId: dto.clientRequestId,
            },
          },
          select: { id: true },
        });
        // `issued: false` bảo đảm request replay cũng không gửi lại email vé.
        if (existing) return { id: existing.id, issued: false };
      }

      // Không tin trạng thái đang hiển thị trên app; kiểm tra lại ở database.
      const event = await tx.event.findUnique({
        where: { id: dto.eventId },
        select: { status: true, title: true },
      });
      if (!event || event.status !== 'PUBLISHED') {
        throw new ConflictException({
          code: ErrorCode.EVENT_NOT_PURCHASABLE,
          message: 'Event is not on sale.',
        });
      }

      /*
       * Khóa tất cả TicketType cần mua trước khi đếm số vé đã giữ. Hai buyer
       * cùng mua những vé cuối sẽ phải chạy lần lượt: transaction sau chỉ được
       * đếm tồn kho sau khi transaction trước commit. ORDER BY id tạo thứ tự
       * lấy nhiều lock thống nhất, giảm nguy cơ deadlock khi hai giỏ chứa nhiều
       * hạng vé theo thứ tự khác nhau.
       */
      await tx.$queryRaw`SELECT id FROM "TicketType" WHERE id = ANY(${ticketTypeIds}::uuid[]) ORDER BY id FOR UPDATE`;

      /*
       * Lọc đồng thời theo id và eventId để ngăn client ghép hạng vé của sự
       * kiện A vào Order của sự kiện B. So sánh length còn phát hiện ID giả hoặc
       * ID không tồn tại.
       */
      const types = await tx.ticketType.findMany({
        where: { id: { in: ticketTypeIds }, eventId: dto.eventId },
        select: { id: true, priceVnd: true, quantityTotal: true },
      });
      if (types.length !== ticketTypeIds.length) {
        throw new ConflictException({
          code: ErrorCode.EVENT_NOT_PURCHASABLE,
          message: 'Ticket type does not belong to this event.',
        });
      }
      const priceByType = new Map(
        types.map((type) => [type.id, type.priceVnd]),
      );

      /*
       * PENDING là lượng vé đang được giữ trong thời gian chờ thanh toán;
       * PAID là lượng đã bán. EXPIRED/CANCELLED không còn giữ tồn kho nên không
       * xuất hiện trong phép cộng này.
       */
      const reserved = await tx.orderItem.groupBy({
        by: ['ticketTypeId'],
        where: {
          ticketTypeId: { in: ticketTypeIds },
          order: { status: { in: ['PENDING', 'PAID'] } },
        },
        _sum: { quantity: true },
      });
      const reservedByType = new Map(
        reserved.map((row) => [row.ticketTypeId, row._sum.quantity ?? 0]),
      );
      for (const type of types) {
        const available =
          type.quantityTotal - (reservedByType.get(type.id) ?? 0);
        if ((wanted.get(type.id) ?? 0) > available) {
          throw new ConflictException({
            code: ErrorCode.SOLD_OUT,
            message: 'Not enough tickets remaining.',
          });
        }
      }

      /*
       * Tiền trong schema là BigInt. Giữ phép nhân/cộng ở bigint để không bị
       * sai số số nguyên như JavaScript number khi giá trị vượt ngưỡng an toàn.
       */
      let totalVnd = 0n;
      for (const [ticketTypeId, quantity] of wanted) {
        totalVnd += (priceByType.get(ticketTypeId) ?? 0n) * BigInt(quantity);
      }
      // Tên `isPaid` ở đây nghĩa là "đơn có tiền", chưa phải "đã thanh toán".
      const isPaid = totalVnd > 0n;

      const now = new Date();
      if (isPaid) {
        /*
         * Chỉ đếm đơn PENDING còn thời hạn. Đơn hết hạn về mặt thời gian không
         * được chặn buyer tạo đơn mới dù cron chưa kịp đổi nó sang EXPIRED.
         * Row lock User phía trên làm phép đếm + tạo đơn này an toàn đồng thời.
         */
        const pendingOrderCount = await tx.order.count({
          where: {
            buyerId,
            status: 'PENDING',
            expiresAt: { gt: now },
          },
        });
        if (pendingOrderCount >= MAX_PENDING_ORDERS_PER_BUYER) {
          throw new ConflictException({
            code: ErrorCode.PENDING_ORDER_LIMIT_REACHED,
            message: `A buyer may have at most ${MAX_PENDING_ORDERS_PER_BUYER} pending orders.`,
          });
        }
      }

      const holdMinutes = this.config.get<number>('order.holdMinutes') ?? 15;
      const order = await tx.order.create({
        data: {
          buyerId,
          eventId: dto.eventId,
          /*
           * Đơn có tiền ở PENDING cho tới khi webhook SePay xác nhận; chính
           * Order PENDING là bản ghi giữ tồn kho. Đơn miễn phí không cần chờ
           * cổng thanh toán nên được xem là PAID ngay.
           */
          status: isPaid ? 'PENDING' : 'PAID',
          totalVnd,
          transferCode: this.newTransferCode(),
          clientRequestId: dto.clientRequestId ?? null,
          expiresAt: isPaid
            ? new Date(now.getTime() + holdMinutes * 60_000)
            : now,
          paidAt: isPaid ? null : now,
        },
        select: { id: true },
      });

      for (const [ticketTypeId, quantity] of wanted) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            eventId: dto.eventId,
            ticketTypeId,
            quantity,
            unitPriceVnd: priceByType.get(ticketTypeId) ?? 0n,
          },
          select: { id: true },
        });
        /*
         * Chỉ đơn miễn phí phát hành Ticket ngay. Đơn có phí mới chỉ tạo
         * OrderItem để giữ chỗ; PaymentsService sẽ gọi issue() sau khi tiền
         * thực sự khớp. Nhờ vậy người chưa thanh toán không có QR hợp lệ.
         */
        if (!isPaid) {
          await this.tickets.issue(tx, orderItem.id, quantity);
        }
      }

      if (!isPaid) {
        await this.notifications.create(
          {
            userId: buyerId,
            type: 'TICKET_ISSUED',
            data: {
              orderId: order.id,
              eventId: dto.eventId,
              eventTitle: event.title,
              ticketCount: [...wanted.values()].reduce((a, b) => a + b, 0),
            },
            dedupeKey: `ticket-issued:${order.id}`,
          },
          tx,
        );
      }

      return { id: order.id, issued: !isPaid };
    });

    /*
     * Chỉ queue email sau khi transaction đã commit để email không thông báo
     * một vé bị rollback. Không await SMTP vì email là side effect best effort:
     * mail server chậm/hỏng không được làm thất bại nghiệp vụ cấp vé chính.
     */
    if (created.issued) {
      this.ticketEmail.queueTicketsIssued(created.id);
    }

    return this.getById(buyerId, created.id);
  }

  async listPending(buyerId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        buyerId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: orderDetailsInclude,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toResponse(order));
  }

  /**
   * Cancels only an unexpired PENDING order owned by the buyer. The guarded
   * update races safely with the payment webhook: whichever status transition
   * commits first wins, and the loser cannot overwrite it.
   */
  async cancelPending(buyerId: string, orderId: string): Promise<void> {
    /*
     * Đây là compare-and-set (CAS): chỉ đổi status khi row vẫn PENDING, còn hạn
     * và thuộc buyer. Nếu webhook vừa đổi nó thành PAID thì count = 0, thao tác
     * hủy không thể ghi đè kết quả thanh toán.
     */
    const cancelled = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        buyerId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      data: { status: 'CANCELLED' },
    });
    if (cancelled.count === 1) return;

    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found.',
      });
    }

    throw new ConflictException({
      code: ErrorCode.INVALID_STATE_TRANSITION,
      message: 'Only an unexpired pending order may be cancelled.',
    });
  }

  async getById(buyerId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: orderDetailsInclude,
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found.',
      });
    }

    return this.toResponse(order);
  }

  private toResponse(order: OrderWithDetails): OrderResponseDto {
    /*
     * Prisma trả cấu trúc Order -> OrderItem -> Ticket. flatMap làm phẳng toàn
     * bộ Ticket thành một danh sách cho app; qrPayload là chuỗi thực tế được
     * QR component mã hóa, không phải URL ảnh QR được lưu trong database.
     */
    return {
      id: order.id,
      status: order.status,
      totalVnd: Number(order.totalVnd),
      createdAt: order.createdAt.toISOString(),
      event: {
        id: order.event.id,
        title: order.event.title,
        venue: order.event.venue,
        startAt: order.event.startAt.toISOString(),
      },
      tickets: order.items.flatMap((item) =>
        item.tickets.map((ticket) => ({
          id: ticket.id,
          code: ticket.code,
          signature: ticket.signature,
          qrPayload: `${ticket.code}.${ticket.signature}`,
          ticketTypeName: item.ticketType.name,
          status: ticket.status,
        })),
      ),
      payment: this.buildPayment(order),
    };
  }

  /** VietQR details for the checkout screen; only meaningful while PENDING. */
  private buildPayment(order: Order): PaymentInfoDto | undefined {
    // VietQR chỉ có ý nghĩa khi Order vẫn chờ thanh toán.
    if (order.status !== 'PENDING') return undefined;
    const bank = this.config.get<string>('sepay.bank') ?? '';
    const accountNumber = this.config.get<string>('sepay.accountNumber') ?? '';
    const amountVnd = Number(order.totalVnd);
    const qrImageUrl =
      `https://qr.sepay.vn/img?acc=${encodeURIComponent(accountNumber)}` +
      `&bank=${encodeURIComponent(bank)}&amount=${amountVnd}` +
      `&des=${encodeURIComponent(order.transferCode)}`;
    return {
      bank,
      accountNumber,
      amountVnd,
      transferCode: order.transferCode,
      qrImageUrl,
      expiresAt: order.expiresAt.toISOString(),
    };
  }

  private newTransferCode(): string {
    let code = '';
    while (code.length < TRANSFER_CODE_LENGTH) {
      code += TRANSFER_CODE_ALPHABET[randomInt(TRANSFER_CODE_ALPHABET.length)];
    }
    return code;
  }
}
