import { ApiProperty } from '@nestjs/swagger';

import { OrderStatus, TicketStatus } from '../../../generated/prisma';

export class IssuedTicketDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() signature!: string;
  @ApiProperty({
    description: 'QR payload rendered by the client: `code.signature`.',
  })
  qrPayload!: string;
  @ApiProperty() ticketTypeName!: string;
  @ApiProperty({ enum: TicketStatus }) status!: TicketStatus;
}

export class OrderEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() venue!: string;
  @ApiProperty({ format: 'date-time' }) startAt!: string;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ minimum: 0 }) totalVnd!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: OrderEventDto }) event!: OrderEventDto;
  @ApiProperty({ type: [IssuedTicketDto] }) tickets!: IssuedTicketDto[];
}
