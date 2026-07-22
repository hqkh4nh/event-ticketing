import { Injectable } from '@nestjs/common';

import { CheckinResult } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketSignerService } from '../tickets/ticket-signer.service';
import { CheckinGateway } from '../realtime/checkin.gateway';
import {
  CheckedInTicketDto,
  CheckinResponseDto,
} from './dto/checkin-response.dto';
import { ScannerEventDto } from './dto/scanner-event.dto';

type Resolution = {
  result: CheckinResult;
  ticketId: string | null;
  ticket?: CheckedInTicketDto;
};

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: TicketSignerService,
    private readonly gateway: CheckinGateway,
  ) {}

  /**
   * Verifies a scanned QR against the event being scanned and consumes the
   * ticket. Every outcome is logged; a VALID scan is broadcast to the event
   * room. The `WHERE status='ISSUED'` update is the only concurrency guard, so
   * two near-simultaneous scans of one ticket yield exactly one VALID.
   */
  async checkIn(
    eventId: string,
    qr: string,
    staffId: string,
  ): Promise<CheckinResponseDto> {
    const resolution = await this.resolve(eventId, qr, staffId);

    await this.prisma.checkinLog.create({
      data: {
        eventId,
        staffId,
        ticketId: resolution.ticketId,
        result: resolution.result,
        rawPayload: qr,
      },
    });

    const checkedInCount = await this.countCheckedIn(eventId);

    if (resolution.result === 'VALID' && resolution.ticket) {
      this.gateway.emitCheckin(eventId, {
        ticketId: resolution.ticket.id,
        ticketTypeName: resolution.ticket.ticketTypeName,
        checkedInCount,
        scannedAt: new Date().toISOString(),
      });
    }

    return {
      result: resolution.result,
      ticket: resolution.ticket,
      checkedInCount,
    };
  }

  private async resolve(
    eventId: string,
    qr: string,
    staffId: string,
  ): Promise<Resolution> {
    const dot = qr.indexOf('.');
    const code = dot > 0 ? qr.slice(0, dot) : '';
    const signature = dot > 0 ? qr.slice(dot + 1) : '';
    if (!code || !signature || !this.signer.verify(code, signature)) {
      return { result: 'INVALID', ticketId: null };
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      select: {
        id: true,
        sequence: true,
        orderItem: {
          select: {
            order: { select: { eventId: true } },
            ticketType: { select: { name: true } },
          },
        },
      },
    });
    if (!ticket) return { result: 'INVALID', ticketId: null };

    if (ticket.orderItem.order.eventId !== eventId) {
      return { result: 'WRONG_EVENT', ticketId: ticket.id };
    }

    const updated = await this.prisma.$executeRaw`
      UPDATE "Ticket"
      SET status = 'USED', "usedAt" = now(), "usedByStaffId" = ${staffId}::uuid
      WHERE id = ${ticket.id}::uuid AND status = 'ISSUED'`;

    if (updated === 1) {
      return {
        result: 'VALID',
        ticketId: ticket.id,
        ticket: {
          id: ticket.id,
          ticketTypeName: ticket.orderItem.ticketType.name,
          sequence: ticket.sequence,
        },
      };
    }

    // Zero rows: the ticket was not ISSUED. Re-read its current state — the
    // pre-update read may be stale under a concurrent scan.
    const current = await this.prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    return {
      result: current?.status === 'USED' ? 'ALREADY_USED' : 'INVALID',
      ticketId: ticket.id,
    };
  }

  private countCheckedIn(eventId: string): Promise<number> {
    return this.prisma.ticket.count({
      where: { status: 'USED', orderItem: { order: { eventId } } },
    });
  }

  /** Events the scanner is assigned to check in, for the scanner event picker. */
  async listAssignedEvents(userId: string): Promise<ScannerEventDto[]> {
    const rows = await this.prisma.eventStaff.findMany({
      where: { userId },
      orderBy: { event: { startAt: 'asc' } },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            startAt: true,
            status: true,
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.event.id,
      title: row.event.title,
      venue: row.event.venue,
      startAt: row.event.startAt.toISOString(),
      status: row.event.status,
    }));
  }
}
