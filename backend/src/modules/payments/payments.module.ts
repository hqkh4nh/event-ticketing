import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentReviewsService } from './payment-reviews.service';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TicketsModule, NotificationsModule, MailModule],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [PaymentsService, PaymentReviewsService],
})
export class PaymentsModule {}
