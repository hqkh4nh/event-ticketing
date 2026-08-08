import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrderStatus, PaymentStatus } from '../../../generated/prisma';

export class PaymentReviewOrderDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ example: 250000, minimum: 0 }) totalVnd!: number;
  @ApiProperty() transferCode!: string;
  @ApiProperty({ format: 'uuid' }) eventId!: string;
  @ApiProperty() eventTitle!: string;
  @ApiProperty() buyerName!: string;
  @ApiProperty({ type: String, nullable: true }) buyerEmail!: string | null;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class PaymentReviewDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() sepayTxnId!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty({ example: 250000, minimum: 0 }) amountVnd!: number;
  @ApiProperty({ type: String, nullable: true }) transferContent!:
    string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why the webhook could not issue tickets for this transfer.',
  })
  reviewReason!: string | null;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiProperty({ format: 'date-time', type: String, nullable: true })
  reviewedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewedByName!: string | null;
  @ApiProperty({ type: String, nullable: true }) adminNote!: string | null;
  @ApiPropertyOptional({ type: PaymentReviewOrderDto, nullable: true })
  order!: PaymentReviewOrderDto | null;
}

export class PaymentReviewListDto {
  @ApiProperty({ type: [PaymentReviewDto] }) items!: PaymentReviewDto[];
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({
    minimum: 0,
    description:
      'Open cases across both review statuses, ignoring the filters.',
  })
  openCount!: number;
  @ApiProperty({ minimum: 1 }) page!: number;
  @ApiProperty({ minimum: 1, maximum: 100 }) limit!: number;
}
