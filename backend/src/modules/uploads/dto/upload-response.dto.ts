import { ApiProperty } from '@nestjs/swagger';

export class UploadSignatureDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() cloudName!: string;
  @ApiProperty() apiKey!: string;
  @ApiProperty() uploadPreset!: string;
  @ApiProperty() timestamp!: number;
  @ApiProperty() signature!: string;
  @ApiProperty() publicId!: string;
  @ApiProperty() overwrite!: boolean;
  @ApiProperty() invalidate!: boolean;
  @ApiProperty({ type: String, isArray: true })
  allowedFormats!: string[];
}

export class CompleteUploadDto {
  @ApiProperty() secureUrl!: string;
}
