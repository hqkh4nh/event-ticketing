import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEventFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  featured!: boolean;
}
