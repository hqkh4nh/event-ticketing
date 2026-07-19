import { ApiProperty } from '@nestjs/swagger';

import { TicketStatus } from '../../../generated/prisma';

export class MyTicketDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() signature!: string;
  @ApiProperty({
    description: 'QR payload rendered by the client: `code.signature`.',
  })
  qrPayload!: string;
  @ApiProperty({ enum: TicketStatus }) status!: TicketStatus;
  @ApiProperty({ format: 'date-time' }) issuedAt!: string;
  @ApiProperty() ticketTypeName!: string;
  @ApiProperty({ format: 'uuid' }) eventId!: string;
  @ApiProperty() eventTitle!: string;
  @ApiProperty() eventVenue!: string;
  @ApiProperty({ format: 'date-time' }) eventStartAt!: string;
}
