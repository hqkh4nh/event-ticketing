import {
  BadRequestException,
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { CurrentUserData } from '../jwt.strategy';
import { ErrorCode } from '../../../common/errors/error-code';

@Injectable()
export class EventStaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserData;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      query?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_ROLE,
        message: 'Your role cannot perform this action.',
      });
    }

    if (user.role === 'ADMIN') return true;

    const eventId =
      request.params?.eventId ??
      (typeof request.body?.eventId === 'string'
        ? request.body.eventId
        : undefined) ??
      request.query?.eventId;

    if (!eventId) {
      throw new BadRequestException({
        code: ErrorCode.EVENT_ID_REQUIRED,
        message: 'eventId is required.',
      });
    }

    const assigned = await this.prisma.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { id: true },
    });

    if (!assigned) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_EVENT_STAFF,
        message: 'You are not assigned to this event.',
      });
    }

    return true;
  }
}
