import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Locale, Role, UserStatus } from '../../generated/prisma';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../common/errors/error-code';

export type JwtPayload = { sub: string; sid: string };

export type CurrentUserData = {
  id: string;
  sessionId: string;
  // Null for SCANNER device accounts, which have no login identity.
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  locale: Locale;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserData> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            role: true,
            status: true,
            locale: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: ErrorCode.SESSION_INVALID,
        message: 'Session is no longer valid.',
      });
    }

    const user = session.user;
    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_BLOCKED,
        message: 'Your account has been blocked.',
      });
    }

    return { ...user, sessionId: payload.sid };
  }
}
