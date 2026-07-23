import { createHash } from 'crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Prisma, Role, UserStatus } from '../../generated/prisma';
import { ErrorCode } from '../../common/errors/error-code';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

const DUMMY_HASH = bcrypt.hashSync('eticket-dummy-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const role: Role = dto.role ?? 'ATTENDEE';

    const status: UserStatus = role === 'ORGANIZER' ? 'PENDING' : 'ACTIVE';

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          role,
          status,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
        },
      });

      return this.buildSession(user);
    } catch (error) {
      // P2002: Unique constraint failed on the {constraint}
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCode.EMAIL_ALREADY_REGISTERED,
          message: 'Email is already registered.',
        });
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    const hash = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(dto.password, hash);

    if (!user || !user.passwordHash || !passwordOk) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Email or password is incorrect.',
      });
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_BLOCKED,
        message: 'This account has been blocked.',
      });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };

    return this.buildSession(safeUser);
  }

  /**
   * Redeems a one-time connect code for a scanner-device session. Every failure
   * mode maps to the single INVALID_CONNECT_CODE so a probe cannot learn
   * whether a code exists, expired, or was already used.
   */
  async staffConnect(rawCode: string): Promise<AuthResponseDto> {
    const codeHash = createHash('sha256')
      .update(rawCode.trim().toUpperCase())
      .digest('hex');

    const record = await this.prisma.staffConnectCode.findUnique({
      where: { codeHash },
      select: {
        id: true,
        expiresAt: true,
        staff: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      !record ||
      record.expiresAt <= new Date() ||
      record.staff.status === 'BLOCKED'
    ) {
      throw this.invalidConnectCode();
    }

    // Conditional update is the single-use guard: two devices racing on one
    // code get exactly one session.
    const redeemed = await this.prisma.staffConnectCode.updateMany({
      where: { id: record.id, redeemedAt: null },
      data: { redeemedAt: new Date() },
    });
    if (redeemed.count !== 1) {
      throw this.invalidConnectCode();
    }

    const expiresIn =
      this.config.get<StringValue>('jwt.scannerExpiresIn') ?? '30d';
    return this.buildSession(record.staff, expiresIn);
  }

  private invalidConnectCode(): UnauthorizedException {
    return new UnauthorizedException({
      code: ErrorCode.INVALID_CONNECT_CODE,
      message: 'Connect code is invalid.',
    });
  }

  private buildSession(
    user: {
      id: string;
      email: string | null;
      fullName: string;
      role: Role;
      status: UserStatus;
    },
    expiresInOverride?: StringValue,
  ): AuthResponseDto {
    const expiresIn =
      expiresInOverride ??
      this.config.get<StringValue>('jwt.expiresIn') ??
      '1d';
    const accessToken = this.jwt.sign(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn,
      },
    );
    return { accessToken, user };
  }
}
