import { ApiProperty } from '@nestjs/swagger';

import { EventCategory, EventStatus } from '../../../generated/prisma';

export class AdminEventTicketTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 200000, minimum: 0 }) priceVnd!: number;
  @ApiProperty({ minimum: 1 }) quantityTotal!: number;
  @ApiProperty({ minimum: 0, description: 'Held or paid tickets.' })
  soldCount!: number;
}

export class AdminEventDetailDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizerId!: string;
  @ApiProperty() organizerName!: string;
  @ApiProperty({ type: String, nullable: true }) organizerEmail!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() venue!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ enum: EventCategory }) category!: EventCategory;
  @ApiProperty({ enum: EventStatus }) status!: EventStatus;
  @ApiProperty() featured!: boolean;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({ format: 'date-time' }) endAt!: string;
  @ApiProperty({ type: String, nullable: true }) coverImageUrl!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why the event was hidden; null unless the status is HIDDEN.',
  })
  hiddenReason!: string | null;
  @ApiProperty({ type: [AdminEventTicketTypeDto] })
  ticketTypes!: AdminEventTicketTypeDto[];
  @ApiProperty({ minimum: 0 }) sold!: number;
  @ApiProperty({ minimum: 0 }) capacity!: number;
  @ApiProperty({ minimum: 0, description: 'Revenue from PAID orders, in VND.' })
  revenueVnd!: number;
  @ApiProperty({ minimum: 0, description: 'Guests admitted so far.' })
  checkedInCount!: number;
}
