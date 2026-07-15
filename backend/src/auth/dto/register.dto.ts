import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SELF_SIGNUP_ROLES = ['ATTENDEE', 'ORGANIZER'] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

export class RegisterDto {
    @ApiProperty({ example: 'khanh@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'matkhau-cua-toi', minLength: 8, maxLength: 64 })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    password!: string;

    @ApiProperty({ example: 'Huynh Quoc Khanh' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    fullName!: string;

    @ApiPropertyOptional({ enum: SELF_SIGNUP_ROLES, default: 'ATTENDEE' })
    @IsOptional()
    @IsIn(SELF_SIGNUP_ROLES)
    role?: SelfSignupRole;
}