import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id!: string;
  // Null for SCANNER device accounts, which have no login identity.
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: ['ATTENDEE', 'ORGANIZER', 'SCANNER', 'ADMIN'] })
  role!: string;
  @ApiProperty({ enum: ['ACTIVE', 'PENDING', 'BLOCKED'] }) status!: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}
