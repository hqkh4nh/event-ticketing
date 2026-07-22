import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CheckinResult } from '../../../generated/prisma';

export class CheckedInTicketDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() ticketTypeName!: string;
  @ApiProperty({ minimum: 1 }) sequence!: number;
}

export class CheckinResponseDto {
  @ApiProperty({
    enum: CheckinResult,
    description: 'Outcome of the scan; every outcome is a 200 response.',
  })
  result!: CheckinResult;

  @ApiPropertyOptional({
    type: CheckedInTicketDto,
    description: 'Present only when result is VALID.',
  })
  ticket?: CheckedInTicketDto;

  @ApiProperty({
    minimum: 0,
    description: 'Guests admitted so far (USED tickets of the event).',
  })
  checkedInCount!: number;
}
