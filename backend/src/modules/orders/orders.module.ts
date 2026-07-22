import { Module } from '@nestjs/common';

import { TicketsModule } from '../tickets/tickets.module';
import { OrdersExpiryService } from './orders-expiry.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TicketsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExpiryService],
})
export class OrdersModule {}
