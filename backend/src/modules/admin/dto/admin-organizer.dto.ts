import { ApiProperty } from '@nestjs/swagger';

import { UserStatus } from '../../../generated/prisma';

export class AdminOrganizerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ minimum: 0 }) eventCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AdminOrganizerListDto {
  @ApiProperty({ type: [AdminOrganizerDto] })
  items!: AdminOrganizerDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;
}
