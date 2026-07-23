import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StaffConnectDto {
  @ApiProperty({ example: 'K7WMPX2Q', description: 'One-time connect code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code!: string;
}
