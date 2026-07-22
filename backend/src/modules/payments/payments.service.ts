import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
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

    // Idempotency: a transaction we have already recorded is a no-op.
    const seen = await this.prisma.payment.findUnique({
      where: { sepayTxnId },
      select: { id: true },
    });
    if (seen) return;

    const amountVnd = BigInt(body.transferAmount);
    const transferCode = body.code ?? '';
    const order = transferCode
      ? await this.prisma.order.findUnique({
          where: { transferCode },
          select: { id: true, status: true, totalVnd: true },
        })
      : null;

    const base = {
      sepayTxnId,
      orderId: order?.id ?? null,
      amountVnd,
      transferContent: body.content,
      rawPayload: body as unknown as Prisma.InputJsonValue,
    };

    // No order for this code, or the amount does not match: nothing to issue.
    if (!order || order.totalVnd !== amountVnd) {
      await this.recordPayment({ ...base, status: 'UNMATCHED' });
      return;
    }

    if (order.status === 'PENDING') {
      const issued = await this.prisma.$transaction(async (tx) => {
        const flipped = await tx.$executeRaw`
          UPDATE "Order" SET status = 'PAID', "paidAt" = now()
          WHERE id = ${order.id}::uuid AND status = 'PENDING'`;
        if (flipped === 0) return false;
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
        return true;
      });
      if (issued) return;
      // Lost the flip to the expiry sweep; fall through to review.
    }

    // Money arrived for an order that is no longer PENDING (expired, cancelled,
    // already paid, or just-expired). Do not issue; flag for manual review.
    await this.recordPayment({
      ...base,
      status: 'REVIEW_REQUIRED',
      reviewReason: `Payment received for order in status ${order.status}.`,
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
        type: 'PAYMENT_REVIEW_REQUIRED',
        title: 'Payment needs review',
        body: `A SePay transfer (txn ${sepayTxnId}) could not be matched to a payable order.`,
        dedupeKey: `payment-review:${sepayTxnId}:${admin.id}`,
      })),
      skipDuplicates: true,
    });
  }
}
