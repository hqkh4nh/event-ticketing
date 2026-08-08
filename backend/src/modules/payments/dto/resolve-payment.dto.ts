import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ResolvePaymentDto {
  @ApiProperty({
    maxLength: 500,
    description:
      'What was done about the money, since the platform never moves it: a refund reference, a contact log, or why no action was needed.',
  })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note!: string;
}
