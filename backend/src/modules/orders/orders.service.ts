import { randomBytes } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
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

    const orderId = await this.prisma.$transaction(async (tx) => {
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
        if (existing) return existing.id;
      }

      const event = await tx.event.findUnique({
        where: { id: dto.eventId },
        select: { status: true },
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
      if (types.some((type) => type.priceVnd > 0n)) {
        throw new ConflictException({
          code: ErrorCode.PAYMENT_NOT_AVAILABLE,
          message: 'Paid tickets are not available yet.',
        });
      }

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

      const now = new Date();
      const order = await tx.order.create({
        data: {
          buyerId,
          eventId: dto.eventId,
          status: 'PAID',
          totalVnd: 0n,
          transferCode: this.newTransferCode(),
          clientRequestId: dto.clientRequestId ?? null,
          expiresAt: now,
          paidAt: now,
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
            unitPriceVnd: 0n,
          },
          select: { id: true },
        });
        await this.tickets.issue(tx, orderItem.id, quantity);
      }

      return order.id;
    });

    return this.getById(buyerId, orderId);
  }

  async getById(buyerId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: {
        event: {
          select: { id: true, title: true, venue: true, startAt: true },
        },
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found.',
      });
    }

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
    };
  }

  private newTransferCode(): string {
    return `EVT${randomBytes(9).toString('base64url')}`;
  }
}
