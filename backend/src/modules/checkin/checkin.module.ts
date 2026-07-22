import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { ScannerController } from './scanner.controller';

@Module({
  imports: [AuthModule, RealtimeModule, TicketsModule],
  controllers: [CheckinController, ScannerController],
  providers: [CheckinService],
})
export class CheckinModule {}
