import { randomBytes } from 'node:crypto';

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
    // Merge duplicate lines so each ticket type maps to one OrderItem
    // (OrderItem is unique per [orderId, ticketTypeId]).
    const wanted = new Map<string, number>();
    for (const item of dto.items) {
      wanted.set(
        item.ticketTypeId,
        (wanted.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }
    const ticketTypeIds = [...wanted.keys()];

    const created = await this.prisma.$transaction(async (tx) => {
      // Serialize purchases from one account so concurrent requests cannot
      // both observe the same pending-order count and exceed the limit.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${buyerId}::uuid FOR UPDATE`;

      if (dto.clientRequestId) {
        const existing = await tx.order.findUnique({
          where: {
            buyerId_clientRequestId: {
              buyerId,
              clientRequestId: dto.clientRequestId,
            },
          },
          select: { id: true },
        });
        // A replayed request issues nothing, so it must not mail anything either.
        if (existing) return { id: existing.id, issued: false };
      }

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

      // Lock the ticket-type rows (ordered, to avoid deadlocks) so the reserved
      // count below reflects any order that committed just before us.
      await tx.$queryRaw`SELECT id FROM "TicketType" WHERE id = ANY(${ticketTypeIds}::uuid[]) ORDER BY id FOR UPDATE`;

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

      let totalVnd = 0n;
      for (const [ticketTypeId, quantity] of wanted) {
        totalVnd += (priceByType.get(ticketTypeId) ?? 0n) * BigInt(quantity);
      }
      const isPaid = totalVnd > 0n;

      const now = new Date();
      if (isPaid) {
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
          // A paid order stays PENDING until the SePay webhook confirms payment;
          // the PENDING row itself is the inventory hold. A free order is paid
          // and issued immediately.
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
        // Tickets for a paid order are issued only when payment lands.
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

    // Sent after the commit and never awaited: a slow or dead SMTP server must
    // not roll back issued tickets or hold up the response. The service
    // swallows its own failures.
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
    return `EVT${randomBytes(9).toString('base64url')}`;
  }
}
