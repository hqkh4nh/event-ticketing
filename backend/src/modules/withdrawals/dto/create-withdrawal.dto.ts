import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateWithdrawalDto {
  @ApiProperty({ example: 500000, minimum: 0, description: 'VND, integer' })
  @IsInt()
  @Min(0)
  amountVnd!: number;

  @ApiProperty({ example: 'Vietcombank', maxLength: 100 })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @ApiProperty({ example: '0071000123456', maxLength: 50 })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bankAccountNumber!: string;

  @ApiProperty({ example: 'HUYNH QUOC KHANH', maxLength: 100 })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankAccountHolder!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  organizerNote?: string;
}
