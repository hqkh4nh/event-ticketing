import { ApiProperty } from '@nestjs/swagger';

export class StaffDeviceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Gate 1' }) label!: string;
  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED'] }) status!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  lastScanAt!: string | null;
  @ApiProperty() hasActiveCode!: boolean;
}

export class CreateStaffResponseDto {
  @ApiProperty({ type: StaffDeviceDto }) staff!: StaffDeviceDto;
  // Plaintext connect code; returned exactly once, never stored.
  @ApiProperty({ example: 'K7WMPX2Q' }) connectCode!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class ReconnectResponseDto {
  @ApiProperty({ example: 'K7WMPX2Q' }) connectCode!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
