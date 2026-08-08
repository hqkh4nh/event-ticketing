import { ApiProperty } from '@nestjs/swagger';

import { EventStatus } from '../../../generated/prisma';

export class AdminEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizerId!: string;
  @ApiProperty() organizerName!: string;
  @ApiProperty() title!: string;
  @ApiProperty() venue!: string;
  @ApiProperty({ enum: EventStatus }) status!: EventStatus;
  @ApiProperty() featured!: boolean;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why the event was hidden; null unless the status is HIDDEN.',
  })
  hiddenReason!: string | null;
  @ApiProperty({ minimum: 0 }) sold!: number;
  @ApiProperty({ minimum: 0 }) capacity!: number;
}

export class AdminEventListDto {
  @ApiProperty({ type: [AdminEventDto] })
  items!: AdminEventDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;
}
