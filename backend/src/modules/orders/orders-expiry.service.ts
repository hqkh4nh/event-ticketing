import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersExpiryService {
  private readonly logger = new Logger(OrdersExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Expires PENDING orders past their hold window. Availability counts only
   * PENDING and PAID orders, so flipping to EXPIRED releases the held seats
   * with no extra bookkeeping. The `status='PENDING'` guard keeps this from
   * clobbering an order the webhook just marked PAID.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepExpired(): Promise<void> {
    const count = await this.prisma.$executeRaw`
      UPDATE "Order" SET status = 'EXPIRED', "expiredAt" = now()
      WHERE status = 'PENDING' AND "expiresAt" < now()`;
    if (count > 0) {
      this.logger.log(`Expired ${count} stale pending order(s).`);
    }
  }
}
