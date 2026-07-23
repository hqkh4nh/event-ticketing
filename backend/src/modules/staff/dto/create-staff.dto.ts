import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Gate 1', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;
}
