import { Module } from '@nestjs/common';

import { TicketSignerService } from './ticket-signer.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketSignerService, TicketsService],
  exports: [TicketsService, TicketSignerService],
})
export class TicketsModule {}
