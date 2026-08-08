import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { WithdrawalStatus } from '../../../generated/prisma';

export class WithdrawalDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizerId!: string;
  @ApiProperty() organizerName!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  organizerEmail!: string | null;
  @ApiProperty({ minimum: 0, description: 'VND, integer' }) amountVnd!: number;
  @ApiProperty({ enum: WithdrawalStatus }) status!: WithdrawalStatus;
  @ApiProperty() bankName!: string;
  @ApiProperty() bankAccountNumber!: string;
  @ApiProperty() bankAccountHolder!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  organizerNote!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  rejectionReason!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  transferReference!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  adminNote!: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  paidAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class WithdrawalListDto {
  @ApiProperty({ type: [WithdrawalDto] })
  items!: WithdrawalDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;
}
