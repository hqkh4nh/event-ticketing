import { Injectable, NotFoundException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import {
  Prisma,
  type Notification,
  type NotificationType,
} from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NotificationDto,
  NotificationListDto,
  UnreadNotificationCountDto,
} from './dto/notification.dto';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  data?: Prisma.InputJsonValue;
  dedupeKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationListDto> {
    const where = { userId };
    const skip = (query.page - 1) * query.limit;
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      items: items.map(toDto),
      total,
      unreadCount,
      page: query.page,
      limit: query.limit,
    };
  }

  async unreadCount(userId: string): Promise<UnreadNotificationCountDto> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (updated.count !== 1) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Notification not found.',
      });
    }

    const notification = await this.prisma.notification.findUniqueOrThrow({
      where: { id },
    });
    return toDto(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Creates a notification. Pass the caller's transaction client to have it
   * commit atomically with the work it announces.
   */
  async create(
    input: CreateNotificationInput,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<NotificationDto> {
    const notification = await client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        ...(input.data !== undefined ? { data: input.data } : {}),
        ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
      },
    });

    return toDto(notification);
  }
}

function toDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    data: toObject(notification.data),
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}
