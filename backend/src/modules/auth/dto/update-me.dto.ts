import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

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
  @ApiProperty({ enum: APP_LOCALES })
  @IsIn(APP_LOCALES)
  locale!: AppLocale;
}
