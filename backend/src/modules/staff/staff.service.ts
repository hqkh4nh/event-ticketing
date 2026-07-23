import { createHash, randomBytes } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStaffResponseDto,
  ReconnectResponseDto,
  StaffDeviceDto,
} from './dto/staff-device.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

// Excludes 0/O/1/I so codes survive being read aloud or copied from paper.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
// Long enough for "set up the week before, hand out codes, staff connect later".
const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Owns the lifecycle of SCANNER device accounts and their connect codes.
 * Every scanner is created here, which is what enforces the subtype invariant:
 * role = SCANNER <=> email IS NULL <=> managedById IS NOT NULL.
 */
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a device account bound to one event the organizer owns and returns
   * the one-time connect code. The plaintext code exists only in this response;
   * the database keeps its SHA-256 hash.
   */
  async createDevice(
    organizerId: string,
    eventId: string,
    label: string,
  ): Promise<CreateStaffResponseDto> {
    await this.loadOwnedEvent(organizerId, eventId);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    const staff = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: 'SCANNER',
          fullName: label,
          email: null,
          passwordHash: null,
          managedById: organizerId,
        },
        select: { id: true, fullName: true, status: true },
      });
      await tx.eventStaff.create({ data: { eventId, userId: user.id } });
      await tx.staffConnectCode.create({
        data: { staffId: user.id, codeHash: this.hashCode(code), expiresAt },
      });
      return user;
    });

    return {
      staff: {
        id: staff.id,
        label: staff.fullName,
        status: staff.status,
        lastScanAt: null,
        hasActiveCode: true,
      },
      connectCode: code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** Devices assigned to one of the organizer's events, newest first. */
  async listDevices(
    organizerId: string,
    eventId: string,
  ): Promise<StaffDeviceDto[]> {
    await this.loadOwnedEvent(organizerId, eventId);

    const assignments = await this.prisma.eventStaff.findMany({
      where: { eventId, user: { role: 'SCANNER' } },
      orderBy: { createdAt: 'desc' },
      select: {
        user: { select: { id: true, fullName: true, status: true } },
      },
    });
    const staffIds = assignments.map((row) => row.user.id);
    if (staffIds.length === 0) return [];

    const [lastScans, activeCodes] = await Promise.all([
      this.prisma.checkinLog.groupBy({
        by: ['staffId'],
        where: { staffId: { in: staffIds } },
        _max: { scannedAt: true },
      }),
      this.prisma.staffConnectCode.findMany({
        where: {
          staffId: { in: staffIds },
          redeemedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { staffId: true },
      }),
    ]);
    const lastScanByStaff = new Map(
      lastScans.map((row) => [row.staffId, row._max.scannedAt]),
    );
    const hasCode = new Set(activeCodes.map((row) => row.staffId));

    return assignments.map(({ user }) => ({
      id: user.id,
      label: user.fullName,
      status: user.status,
      lastScanAt: lastScanByStaff.get(user.id)?.toISOString() ?? null,
      hasActiveCode: hasCode.has(user.id),
    }));
  }

  /**
   * Invalidates any unredeemed code for the device and issues a fresh one —
   * the recovery path when a token expired or the phone was lost. At most one
   * live code exists per device at any time.
   */
  async reconnect(
    organizerId: string,
    staffId: string,
  ): Promise<ReconnectResponseDto> {
    await this.loadOwnedStaff(organizerId, staffId);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.staffConnectCode.deleteMany({
        where: { staffId, redeemedAt: null },
      }),
      this.prisma.staffConnectCode.create({
        data: { staffId, codeHash: this.hashCode(code), expiresAt },
      }),
    ]);

    return { connectCode: code, expiresAt: expiresAt.toISOString() };
  }

  /** Block/unblock takes effect immediately: status is read per request. */
  async updateDevice(
    organizerId: string,
    staffId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffDeviceDto> {
    await this.loadOwnedStaff(organizerId, staffId);

    const user = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.label !== undefined ? { fullName: dto.label } : {}),
      },
      select: { id: true, fullName: true, status: true },
    });

    const [lastScan, activeCode] = await Promise.all([
      this.prisma.checkinLog.findFirst({
        where: { staffId },
        orderBy: { scannedAt: 'desc' },
        select: { scannedAt: true },
      }),
      this.prisma.staffConnectCode.findFirst({
        where: { staffId, redeemedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      }),
    ]);

    return {
      id: user.id,
      label: user.fullName,
      status: user.status,
      lastScanAt: lastScan?.scannedAt.toISOString() ?? null,
      hasActiveCode: activeCode !== null,
    };
  }

  hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private generateCode(): string {
    // 256 is an exact multiple of the 32-char alphabet, so modulo is unbiased.
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';
    for (const byte of bytes) {
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    return code;
  }

  private async loadOwnedStaff(organizerId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, managedById: organizerId, role: 'SCANNER' },
      select: { id: true },
    });
    if (!staff) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Staff device not found.',
      });
    }
    return staff;
  }

  private async loadOwnedEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizerId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }
    return event;
  }
}
