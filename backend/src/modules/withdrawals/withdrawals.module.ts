import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WithdrawalsAdminController } from './withdrawals-admin.controller';
import { WithdrawalsOrganizerController } from './withdrawals-organizer.controller';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  imports: [AuthModule],
  controllers: [WithdrawalsOrganizerController, WithdrawalsAdminController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
