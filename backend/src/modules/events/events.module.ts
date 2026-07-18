import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EventsOrganizerController } from './events-organizer.controller';
import { EventsOrganizerService } from './events-organizer.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule],
  controllers: [EventsController, EventsOrganizerController],
  providers: [EventsService, EventsOrganizerService],
})
export class EventsModule {}
