import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role, UserStatus } from '../../generated/prisma';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../common/errors/error-code';

export type JwtPayload = { sub: string };

export type CurrentUserData = {
  id: string;
  // Null for SCANNER device accounts, which have no login identity.
  email: string | null;
  fullName: string;
  role: Role;
  status: UserStatus;
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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.SESSION_INVALID,
        message: 'Session is no longer valid.',
      });
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_BLOCKED,
        message: 'Your account has been blocked.',
      });
    }

    return user;
  }
}
