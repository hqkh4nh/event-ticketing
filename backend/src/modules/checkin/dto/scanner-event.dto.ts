import { ApiProperty } from '@nestjs/swagger';

import { EventStatus } from '../../../generated/prisma';

export class ScannerEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() venue!: string;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({ enum: EventStatus }) status!: EventStatus;
}
