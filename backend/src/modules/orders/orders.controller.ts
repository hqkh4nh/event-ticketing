import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create an order. Free orders are paid and issued immediately; paid orders return PENDING with VietQR payment details.',
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiConflictResponse({
    description: 'EVENT_NOT_PURCHASABLE | SOLD_OUT',
  })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orders.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current user's orders." })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'NOT_FOUND' })
  getOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.orders.getById(user.id, id);
  }
}
