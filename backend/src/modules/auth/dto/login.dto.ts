import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'khanh@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'matkhau-cua-toi' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  password!: string;
}
