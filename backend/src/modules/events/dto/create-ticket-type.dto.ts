import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTicketTypeDto {
  @ApiProperty({ example: 'General Admission', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 200000, minimum: 0, description: 'VND, integer' })
  @IsInt()
  @Min(0)
  priceVnd!: number;

  @ApiProperty({ example: 500, minimum: 1 })
  @IsInt()
  @Min(1)
  quantityTotal!: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601()
  salesStartAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601()
  salesEndAt?: string | null;
}
