import { Injectable } from '@nestjs/common';

import { Prisma, Ticket } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { MyTicketDto } from './dto/ticket.dto';
import { TicketSignerService } from './ticket-signer.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: TicketSignerService,
  ) {}

  /**
   * Issues `quantity` signed tickets for an order item, inside the caller's
   * transaction so issuance commits atomically with the order.
   */
  async issue(
    tx: Prisma.TransactionClient,
    orderItemId: string,
    quantity: number,
  ): Promise<Ticket[]> {
    /*
     * Service nhận TransactionClient từ caller để việc tạo Ticket commit/rollback
     * cùng Order/Payment. issue() không tự kiểm tra thanh toán; OrdersService và
     * PaymentsService phải chứng minh đơn đủ điều kiện trước khi gọi hàm này.
     */
    const tickets: Ticket[] = [];
    for (let sequence = 1; sequence <= quantity; sequence += 1) {
      /*
       * Mỗi ghế/vé là một row độc lập và có QR riêng. sequence chỉ là số thứ tự
       * dễ đọc trong cùng OrderItem; code ngẫu nhiên mới là định danh đưa vào QR.
       */
      const code = this.signer.newCode();
      tickets.push(
        await tx.ticket.create({
          data: {
            orderItemId,
            sequence,
            code,
            signature: this.signer.sign(code),
          },
        }),
      );
    }
    return tickets;
  }

  async listMyTickets(userId: string): Promise<MyTicketDto[]> {
    // Lọc xuyên relation Order để user chỉ đọc được vé do chính họ mua.
    const tickets = await this.prisma.ticket.findMany({
      where: { orderItem: { order: { buyerId: userId } } },
      orderBy: { issuedAt: 'desc' },
      include: {
        orderItem: {
          include: {
            ticketType: { select: { name: true } },
            order: {
              include: {
                event: {
                  select: { id: true, title: true, venue: true, startAt: true },
                },
              },
            },
          },
        },
      },
    });

    return tickets.map((ticket) => {
      const { ticketType, order } = ticket.orderItem;
      return {
        id: ticket.id,
        code: ticket.code,
        signature: ticket.signature,
        qrPayload: this.signer.qrPayload(ticket.code, ticket.signature),
        status: ticket.status,
        issuedAt: ticket.issuedAt.toISOString(),
        ticketTypeName: ticketType.name,
        eventId: order.event.id,
        eventTitle: order.event.title,
        eventVenue: order.event.venue,
        eventStartAt: order.event.startAt.toISOString(),
      };
    });
  }
}
