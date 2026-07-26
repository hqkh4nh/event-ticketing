import { ApiProperty } from '@nestjs/swagger';

import { NotificationType } from '../../../generated/prisma';

export class NotificationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  data!: Record<string, unknown> | null;
  @ApiProperty() read!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationDto] })
  items!: NotificationDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  unreadCount!: number;

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;
}

export class UnreadNotificationCountDto {
  @ApiProperty({ minimum: 0 })
  count!: number;
}
