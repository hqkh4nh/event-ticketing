import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckinDto {
  @ApiProperty({
    description: 'Ticket QR payload rendered by the client: `code.signature`.',
  })
  @IsString()
  @IsNotEmpty()
  qr!: string;
}
