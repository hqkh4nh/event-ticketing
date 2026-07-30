import { ApiProperty } from '@nestjs/swagger';

import { APP_LOCALES, toAppLocale } from './update-me.dto';

import type { Locale } from '../../../generated/prisma';
import type { AppLocale } from './update-me.dto';

export class AuthUserDto {
  @ApiProperty() id!: string;
  // Null for SCANNER device accounts, which have no login identity.
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty() fullName!: string;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['ATTENDEE', 'ORGANIZER', 'SCANNER', 'ADMIN'] })
  role!: string;
  @ApiProperty({ enum: ['ACTIVE', 'PENDING', 'BLOCKED'] }) status!: string;
  @ApiProperty({ enum: APP_LOCALES }) locale!: AppLocale;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}

/** Maps a user row onto the wire shape, translating the stored locale enum. */
export function toAuthUserDto(user: {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  locale: Locale;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    locale: toAppLocale(user.locale),
  };
}
