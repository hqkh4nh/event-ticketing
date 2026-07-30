import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import {
  UploadTarget,
  type UploadTarget as UploadTargetType,
} from '../upload-target';

export class UploadRequestDto {
  @ApiProperty({ enum: Object.values(UploadTarget) })
  @IsIn(Object.values(UploadTarget))
  target!: UploadTargetType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class CompleteUploadRequestDto extends UploadRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
