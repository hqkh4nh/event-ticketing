import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalBalanceDto {
  @ApiProperty({
    minimum: 0,
    description:
      'Paid revenue from events that have already ended. Revenue from upcoming events is not withdrawable yet.',
  })
  settledRevenueVnd!: number;

  @ApiProperty({
    minimum: 0,
    description:
      'Held by requests that are submitted or approved but not paid.',
  })
  pendingVnd!: number;

  @ApiProperty({ minimum: 0, description: 'Already transferred out.' })
  withdrawnVnd!: number;

  @ApiProperty({
    minimum: 0,
    description: 'settledRevenueVnd minus pendingVnd and withdrawnVnd.',
  })
  availableVnd!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Smallest amount a request may ask.',
  })
  minAmountVnd!: number;
}
