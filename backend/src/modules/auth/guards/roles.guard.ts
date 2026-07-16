import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '../../../generated/prisma';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { CurrentUserData } from '../jwt.strategy';
import { ErrorCode } from '../../../common/errors/error-code';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUserData }>();

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_ROLE,
        message: 'Your role cannot perform this action.',
      });
    }

    if (user.status === 'PENDING') {
      throw new ForbiddenException({
        code: ErrorCode.ACCOUNT_PENDING_APPROVAL,
        message: 'This account is awaiting admin approval.',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: ErrorCode.ACCOUNT_BLOCKED,
        message: 'This account has been blocked.',
      });
    }

    return true;
  }
}
