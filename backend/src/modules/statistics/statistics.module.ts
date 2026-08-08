import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  AdminStatisticsController,
  OrganizerStatisticsController,
} from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminStatisticsController, OrganizerStatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
