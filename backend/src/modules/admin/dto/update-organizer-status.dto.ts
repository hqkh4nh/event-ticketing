import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ADMIN_ORGANIZER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type AdminOrganizerStatus = (typeof ADMIN_ORGANIZER_STATUSES)[number];

export class UpdateOrganizerStatusDto {
  @ApiProperty({
    enum: ADMIN_ORGANIZER_STATUSES,
    description:
      'ACTIVE approves or restores the organizer; BLOCKED revokes access.',
  })
  @IsIn(ADMIN_ORGANIZER_STATUSES)
  status!: AdminOrganizerStatus;
}
