import { Module } from '@nestjs/common';

import { TicketsModule } from '../tickets/tickets.module';
import { MailService } from './mail.service';
import { TicketEmailService } from './ticket-email.service';

@Module({
  imports: [TicketsModule],
  providers: [MailService, TicketEmailService],
  exports: [TicketEmailService],
})
export class MailModule {}
