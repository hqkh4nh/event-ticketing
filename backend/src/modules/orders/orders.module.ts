import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsModule } from '../tickets/tickets.module';
import { OrdersExpiryService } from './orders-expiry.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TicketsModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExpiryService],
})
export class OrdersModule {}
