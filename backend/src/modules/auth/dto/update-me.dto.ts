import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Locale } from '../../../generated/prisma';

export const APP_LOCALES = ['vi', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

/** The API speaks lowercase language tags; Prisma stores uppercase enum members. */
export function toPrismaLocale(locale: AppLocale): Locale {
  return locale === 'en' ? Locale.EN : Locale.VI;
}

export function toAppLocale(locale: Locale): AppLocale {
  return locale === Locale.EN ? 'en' : 'vi';
}

export class UpdateMeDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+84 912 345 678',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9][0-9 .-]{7,19}$/)
  phone?: string | null;

  @ApiPropertyOptional({ enum: APP_LOCALES })
  @IsOptional()
  @IsIn(APP_LOCALES)
  locale?: AppLocale;
}
