import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { PaymentStatus } from '../../../generated/prisma';

/** The two statuses that mean money arrived but no ticket was issued for it. */
export const REVIEW_STATUSES = [
  PaymentStatus.REVIEW_REQUIRED,
  PaymentStatus.UNMATCHED,
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class ListPaymentReviewsQueryDto {
  @ApiPropertyOptional({
    enum: REVIEW_STATUSES,
    description: 'Defaults to both review statuses.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Pass true to read the closed cases instead of the open ones.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  resolved = false;

  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
