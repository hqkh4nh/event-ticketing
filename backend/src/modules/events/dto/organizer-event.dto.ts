import { ApiProperty } from '@nestjs/swagger';

import { EventCategory, EventStatus } from '../../../generated/prisma';

export class OrganizerTicketTypeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 200000, minimum: 0 }) priceVnd!: number;
  @ApiProperty({ minimum: 1 }) quantityTotal!: number;
  @ApiProperty({
    minimum: 0,
    description: 'Tickets already sold (0 in this slice)',
  })
  soldCount!: number;
  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  salesStartAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  salesEndAt!: string | null;
}

export class OrganizerEventSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ enum: EventCategory }) category!: EventCategory;
  @ApiProperty({ enum: EventStatus }) status!: EventStatus;
  @ApiProperty() featured!: boolean;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, nullable: true }) coverImageUrl!: string | null;
  @ApiProperty({ minimum: 0 }) ticketTypeCount!: number;
}

export class OrganizerEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizerId!: string;
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
  @ApiProperty({ type: [OrganizerTicketTypeDto] })
  ticketTypes!: OrganizerTicketTypeDto[];
  @ApiProperty({
    minimum: 0,
    description: 'Guests admitted so far (USED tickets of the event).',
  })
  checkedInCount!: number;
}
