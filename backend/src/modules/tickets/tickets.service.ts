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
    const tickets: Ticket[] = [];
    for (let sequence = 1; sequence <= quantity; sequence += 1) {
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
        qrPayload: `${ticket.code}.${ticket.signature}`,
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
