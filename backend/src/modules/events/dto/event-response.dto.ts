import { ApiProperty } from '@nestjs/swagger';

import { EventCategory } from '../../../generated/prisma';

export class EventSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, nullable: true }) coverImageUrl!: string | null;
  @ApiProperty({ example: 200000, minimum: 0 }) minPriceVnd!: number;
  @ApiProperty({ enum: EventCategory }) category!: EventCategory;
  @ApiProperty() featured!: boolean;
}

export class TicketTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 200000, minimum: 0 }) priceVnd!: number;
  @ApiProperty({ minimum: 0 }) quantityRemaining!: number;
}

export class EventDetailDto extends EventSummaryDto {
  @ApiProperty() description!: string;
  @ApiProperty() venue!: string;
  @ApiProperty({ format: 'date-time' }) endAt!: string;
  @ApiProperty({ type: [TicketTypeDto] }) ticketTypes!: TicketTypeDto[];
}
