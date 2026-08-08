import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class MarkWithdrawalPaidDto {
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Bank reference of the manual transfer, for reconciliation.',
  })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  transferReference?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
