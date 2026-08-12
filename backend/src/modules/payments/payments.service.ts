import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketEmailService } from '../mail/ticket-email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';

const TRANSFER_CODE_PATTERN = /^[A-Z0-9]{8}$/;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
    private readonly ticketEmail: TicketEmailService,
  ) {}

  /**
   * Processes a SePay transfer. Idempotent by `sepayTxnId`: a replayed webhook
   * never issues tickets twice. Tickets are issued only when the amount and
   * transfer code match a still-PENDING order, via a conditional flip that also
   * closes the race with the expiry sweep. Money for a non-payable order is
   * recorded for manual review, never issued.
   */
  async handleSepayWebhook(body: SepayWebhookDto): Promise<void> {
    const sepayTxnId = String(body.id);

    /*
     * SePay có thể retry cùng webhook nếu lần gọi trước timeout. sepayTxnId là
     * định danh duy nhất từ SePay; nếu Payment đã tồn tại thì request này là
     * replay và phải trở thành no-op để không tạo vé/notification lần hai.
     */
    const seen = await this.prisma.payment.findUnique({
      where: { sepayTxnId },
      select: { id: true },
    });
    if (seen) return;

    // Dùng BigInt để so sánh tiền chính xác tuyệt đối với Order.totalVnd.
    const amountVnd = BigInt(body.transferAmount);
    const transferContent = body.content.trim().toUpperCase();
    const transferCodeCandidates = new Set<string>();
    /*
     * Nội dung ngân hàng có thể chứa thêm chữ trước/sau mã. Sliding window lấy
     * mọi chuỗi dài 8 ký tự hợp lệ thay vì yêu cầu content chỉ chứa mã. Set loại
     * candidate trùng. Chỉ khi đúng một Order được match mới tự động xử lý để
     * tránh gán tiền nhầm nếu nội dung chứa nhiều mã có thật.
     */
    for (let start = 0; start <= transferContent.length - 8; start += 1) {
      const candidate = transferContent.slice(start, start + 8);
      if (TRANSFER_CODE_PATTERN.test(candidate)) {
        transferCodeCandidates.add(candidate);
      }
    }
    const matchingOrders = transferCodeCandidates.size
      ? await this.prisma.order.findMany({
          where: { transferCode: { in: [...transferCodeCandidates] } },
          take: 2,
          select: {
            id: true,
            status: true,
            totalVnd: true,
            buyerId: true,
            eventId: true,
            event: { select: { title: true } },
          },
        })
      : [];
    const order = matchingOrders.length === 1 ? matchingOrders[0] : null;

    const base = {
      sepayTxnId,
      orderId: order?.id ?? null,
      amountVnd,
      transferContent: body.content,
      rawPayload: body as unknown as Prisma.InputJsonValue,
    };

    /*
     * Không tìm đúng một Order hoặc số tiền không khớp thì chỉ lưu UNMATCHED.
     * Tuyệt đối không đoán Order và không cấp vé khi bằng chứng thanh toán chưa
     * đủ chắc chắn.
     */
    if (!order || order.totalVnd !== amountVnd) {
      await this.recordPayment({ ...base, status: 'UNMATCHED' });
      return;
    }

    if (order.status === 'PENDING') {
      const issued = await this.prisma.$transaction(async (tx) => {
        /*
         * Conditional flip là điểm quyết định duy nhất cho quyền cấp vé. Nó chỉ
         * thắng khi Order vẫn PENDING và chưa hết hạn tại thời điểm database
         * thực thi. Điều này đóng race với cron hết hạn, thao tác hủy và webhook
         * đồng thời: chỉ một transition có thể đổi row.
         */
        const flipped = await tx.$executeRaw`
          UPDATE "Order" SET status = 'PAID', "paidAt" = now()
          WHERE id = ${order.id}::uuid
            AND status = 'PENDING'
            AND "expiresAt" > now()`;
        if (flipped === 0) return false;

        /*
         * Việc đổi PAID, phát hành toàn bộ Ticket, lưu Payment và Notification
         * nằm trong cùng transaction. Bất kỳ bước nào lỗi sẽ rollback tất cả,
         * tránh trạng thái Order PAID nhưng không có vé hoặc có vé nhưng không
         * ghi nhận Payment.
         */
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id },
          select: { id: true, quantity: true },
        });
        for (const item of items) {
          await this.tickets.issue(tx, item.id, item.quantity);
        }
        await tx.payment.create({
          data: { ...base, status: 'MATCHED', matchedAt: new Date() },
        });
        await this.notifications.create(
          {
            userId: order.buyerId,
            type: 'TICKET_ISSUED',
            data: {
              orderId: order.id,
              eventId: order.eventId,
              eventTitle: order.event.title,
              ticketCount: items.reduce((sum, item) => sum + item.quantity, 0),
            },
            dedupeKey: `ticket-issued:${order.id}`,
          },
          tx,
        );
        return true;
      });
      if (issued) {
        // After the commit and never awaited, so SePay gets its 200 without
        // waiting on SMTP and never retries the webhook over a mail timeout.
        this.ticketEmail.queueTicketsIssued(order.id);
        return;
      }
      /*
       * Order được đọc là PENDING nhưng conditional flip thất bại nghĩa là một
       * thao tác khác vừa đổi trạng thái hoặc thời hạn vừa qua. Không dùng dữ
       * liệu đọc cũ để cấp vé; chuyển xuống nhánh review thủ công.
       */
    }

    /*
     * Tiền đã đến nhưng Order không còn payable: có thể EXPIRED, CANCELLED,
     * PAID hoặc vừa hết hạn. Hệ thống không tự cấp vé vì có thể đã giải phóng
     * tồn kho/bán cho người khác. Payment được lưu REVIEW_REQUIRED và Admin
     * nhận thông báo để hoàn tiền hoặc xử lý ngoài hệ thống.
     */
    await this.recordPayment({
      ...base,
      status: 'REVIEW_REQUIRED',
      reviewReason:
        order.status === 'PENDING'
          ? 'Payment received after order expiry.'
          : `Payment received for order in status ${order.status}.`,
    });
    await this.notifyAdmins(sepayTxnId);
  }

  /** Persists a payment; a concurrent duplicate on `sepayTxnId` is ignored. */
  private async recordPayment(
    data: Prisma.PaymentUncheckedCreateInput,
  ): Promise<void> {
    try {
      await this.prisma.payment.create({ data });
    } catch (error) {
      /*
       * Check `seen` phía đầu tối ưu replay thông thường; unique constraint và
       * P2002 là lớp bảo vệ cuối khi hai webhook cùng vượt qua check trước khi
       * một trong hai kịp insert.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private async notifyAdmins(sepayTxnId: string): Promise<void> {
    // Thông báo cho mọi Admin vì case review chưa được gán cho một người cụ thể.
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (!admins.length) {
      this.logger.warn(
        `SePay txn ${sepayTxnId} needs review but no admin exists to notify.`,
      );
      return;
    }
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'PAYMENT_REVIEW_REQUIRED' as const,
        data: { sepayTxnId },
        dedupeKey: `payment-review:${sepayTxnId}:${admin.id}`,
      })),
      skipDuplicates: true,
    });
  }
}
