import { ApiProperty } from "@nestjs/swagger";

export class AuthUserDto {
    @ApiProperty() id!: string;
    @ApiProperty() email!: string;
    @ApiProperty() fullName!: string;
    @ApiProperty({ enum: ['ATTENDEE', 'ORGANIZER', 'SCANNER', 'ADMIN'] }) role!: string;
    @ApiProperty({ enum: ['ACTIVE', 'PENDING', 'BLOCKED'] })status!: string;
}

export class AuthResponseDto {
    @ApiProperty() accessToken!: string;
    @ApiProperty({  type: AuthUserDto }) user!: AuthUserDto;
}