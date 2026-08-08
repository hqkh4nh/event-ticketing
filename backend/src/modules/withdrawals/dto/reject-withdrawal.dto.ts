import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RejectWithdrawalDto {
  @ApiProperty({
    maxLength: 500,
    description: 'Shown to the organizer, so it must explain the decision.',
  })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
