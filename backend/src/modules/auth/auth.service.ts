import { createHash, randomUUID } from 'crypto';

import {
  BadRequestException,
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
import {
  AuthResponseDto,
  AuthUserDto,
  toAuthUserDto,
} from './dto/auth-response.dto';
import { Locale, Prisma, Role, UserStatus } from '../../generated/prisma';
import { ErrorCode } from '../../common/errors/error-code';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto, toPrismaLocale } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
          ...(dto.locale ? { locale: toPrismaLocale(dto.locale) } : {}),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          locale: true,
        },
      });

      return await this.buildSession(user);
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
        phone: true,
        role: true,
        status: true,
        locale: true,
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
      phone: user.phone,
      role: user.role,
      status: user.status,
      locale: user.locale,
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
            phone: true,
            role: true,
            status: true,
            locale: true,
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

  /**
   * Overwrites the stored locale with the device's current language. The device
   * is the source of truth, so this is a one-way push and never merges.
   */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<AuthUserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone?.trim() || null }
          : {}),
        ...(dto.locale !== undefined
          ? { locale: toPrismaLocale(dto.locale) }
          : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        locale: true,
      },
    });

    return toAuthUserDto(user);
  }

  async changePassword(
    userId: string,
    sessionId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    const currentHash = user?.passwordHash;
    const currentPasswordOk =
      currentHash !== null &&
      currentHash !== undefined &&
      (await bcrypt.compare(dto.currentPassword, currentHash));

    if (!currentPasswordOk) {
      throw new BadRequestException({
        code: ErrorCode.CURRENT_PASSWORD_INCORRECT,
        message: 'Current password is incorrect.',
      });
    }

    if (await bcrypt.compare(dto.newPassword, currentHash)) {
      throw new BadRequestException({
        code: ErrorCode.PASSWORD_UNCHANGED,
        message: 'New password must be different from the current password.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId,
          id: { not: sessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private invalidConnectCode(): UnauthorizedException {
    return new UnauthorizedException({
      code: ErrorCode.INVALID_CONNECT_CODE,
      message: 'Connect code is invalid.',
    });
  }

  private async buildSession(
    user: {
      id: string;
      email: string | null;
      fullName: string;
      phone: string | null;
      role: Role;
      status: UserStatus;
      locale: Locale;
    },
    expiresInOverride?: StringValue,
  ): Promise<AuthResponseDto> {
    const expiresIn =
      expiresInOverride ??
      this.config.get<StringValue>('jwt.expiresIn') ??
      '1d';
    const sessionId = randomUUID();
    const accessToken = this.jwt.sign(
      { sub: user.id, sid: sessionId },
      {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn,
      },
    );

    const payload = this.jwt.decode<{ exp?: number }>(accessToken);
    if (!payload?.exp) {
      throw new Error('Signed access token is missing an expiration.');
    }

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(payload.exp * 1000),
      },
    });

    return { accessToken, user: toAuthUserDto(user) };
  }
}
