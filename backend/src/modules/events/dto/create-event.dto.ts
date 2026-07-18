import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { EventCategory } from '../../../generated/prisma';

export class CreateEventDto {
  @ApiProperty({ example: 'Live Concert 2026', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'Hoa Binh Theatre', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  venue!: string;

  @ApiProperty({ example: 'Ha Noi', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ enum: EventCategory })
  @IsEnum(EventCategory)
  category!: EventCategory;

  @ApiProperty({ format: 'date-time', example: '2026-09-01T12:00:00.000Z' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-01T15:00:00.000Z' })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
