import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../../prisma/prisma.service';
import { TicketSignerService } from '../tickets/ticket-signer.service';
import { MailService } from './mail.service';
import { buildTicketIssuedEmail } from './templates/ticket-issued.template';

/**
 * Sends the one email that follows ticket issuance. It loads its own data from
 * an order id and swallows every failure, so a call site only has to hand it an
 * id after its transaction has committed - no DTO threading, no `.catch()` to
 * remember, and no way for a mail problem to affect the tickets.
 */
@Injectable()
export class TicketEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly signer: TicketSignerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TicketEmailService.name);
  }

  /**
   * Fire-and-forget entry point for call sites that have just committed. The
   * promise is dropped here rather than at each call site, so a rejection can
   * never escape as an unhandled rejection - which Node turns into a process
   * exit, taking the API server down over a mail problem.
   */
  queueTicketsIssued(orderId: string): void {
    /*
     * Chủ động "drop" Promise tại một nơi và gắn catch. Caller có thể gọi sau
     * commit mà không await; rejection không trở thành unhandled rejection làm
     * Node process dừng. Đây là in-process best effort, chưa phải durable queue.
     */
    void this.sendTicketsIssued(orderId).catch(() => undefined);
  }

  async sendTicketsIssued(orderId: string): Promise<void> {
    if (!this.mail.isEnabled) return;

    try {
      /*
       * Chỉ nhận orderId rồi query lại dữ liệu đã commit, thay vì truyền object
       * tạm từ transaction. Email vì thế không thể được dựng từ Ticket chưa
       * commit và luôn dùng cùng dữ liệu source of truth với API.
       */
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          buyer: { select: { email: true, fullName: true, locale: true } },
          event: { select: { title: true, venue: true, startAt: true } },
          items: {
            orderBy: { id: 'asc' },
            select: {
              ticketType: { select: { name: true } },
              tickets: {
                orderBy: { sequence: 'asc' },
                select: { code: true, signature: true },
              },
            },
          },
        },
      });

      // Scanner device accounts have no email, and an order with no tickets has
      // nothing to announce.
      if (!order?.buyer.email) return;

      /*
       * Mỗi Ticket có QR riêng. qrPayload dùng TicketSignerService giống API/app,
       * tránh format QR trong email bị lệch với format Scanner xác minh.
       */
      const tickets = order.items.flatMap((item) =>
        item.tickets.map((ticket) => ({
          ticketTypeName: item.ticketType.name,
          code: ticket.code,
          qrPayload: this.signer.qrPayload(ticket.code, ticket.signature),
        })),
      );
      if (!tickets.length) return;

      const email = await buildTicketIssuedEmail(
        {
          recipientName: order.buyer.fullName,
          eventTitle: order.event.title,
          eventVenue: order.event.venue,
          eventStartAt: order.event.startAt,
          tickets,
        },
        order.buyer.locale,
      );

      await this.mail.send({ to: order.buyer.email, ...email });
    } catch (error) {
      this.logger.error(
        { err: error, orderId },
        'Failed to send the ticket email',
      );
    }
  }
}
