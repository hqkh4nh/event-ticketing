import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * SePay transaction webhook payload. Every field SePay sends is declared so the
 * global `forbidNonWhitelisted` pipe does not reject the request; only `id`,
 * `transferAmount`, `code`, and `content` drive matching.
 */
export class SepayWebhookDto {
  @ApiProperty({ description: 'SePay transaction id; stable across retries.' })
  @IsInt()
  id!: number;

  @ApiProperty({ description: 'Amount transferred, in VND.' })
  @IsInt()
  @Min(0)
  transferAmount!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Payment code SePay parsed from the transfer content.',
  })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ description: 'Raw transfer content from the bank.' })
  @IsString()
  content!: string;

  @ApiProperty({ description: "Transfer direction: 'in' or 'out'." })
  @IsString()
  transferType!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() gateway?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() accumulated?: number;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  subAccount?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
