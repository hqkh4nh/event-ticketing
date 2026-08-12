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
    // resolve() chỉ quyết định và tiêu thụ vé; checkIn() điều phối log/realtime.
    const resolution = await this.resolve(eventId, qr, staffId);

    /*
     * Ghi tất cả kết quả, không chỉ VALID. Log INVALID/WRONG_EVENT/ALREADY_USED
     * phục vụ audit, phát hiện gian lận và truy lại thiết bị nào đã quét payload.
     * ticketId null khi payload giả đến mức không xác định được Ticket.
     */
    await this.prisma.checkinLog.create({
      data: {
        eventId,
        staffId,
        ticketId: resolution.ticketId,
        result: resolution.result,
        rawPayload: qr,
      },
    });

    // Đếm từ source of truth sau lần scan thay vì tự tăng một counter dễ lệch.
    const checkedInCount = await this.countCheckedIn(eventId);

    if (resolution.result === 'VALID' && resolution.ticket) {
      // Chỉ scan thành công mới làm dashboard Organizer cập nhật realtime.
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
    /*
     * QR có format `code.signature`. indexOf('.') lấy dấu phân cách đầu tiên;
     * thiếu code, thiếu signature hoặc HMAC sai đều là payload giả/không hợp lệ
     * và bị loại trước khi query database.
     */
    const dot = qr.indexOf('.');
    const code = dot > 0 ? qr.slice(0, dot) : '';
    const signature = dot > 0 ? qr.slice(dot + 1) : '';
    if (!code || !signature || !this.signer.verify(code, signature)) {
      return { result: 'INVALID', ticketId: null };
    }

    /*
     * Chữ ký hợp lệ chỉ chứng minh payload do server ký, chưa chứng minh vé còn
     * dùng được. Database vẫn phải cung cấp Ticket hiện tại, Event sở hữu vé và
     * tên TicketType để kiểm tra nghiệp vụ/trả response.
     */
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

    // QR thật nhưng mang tới sai cổng/sai sự kiện là WRONG_EVENT, không phải giả.
    if (ticket.orderItem.order.eventId !== eventId) {
      return { result: 'WRONG_EVENT', ticketId: ticket.id };
    }

    /*
     * Atomic consume: điều kiện status = ISSUED vừa kiểm tra vừa cập nhật trong
     * một câu SQL. Hai scanner quét đồng thời có thể cùng đọc Ticket, nhưng chỉ
     * một câu UPDATE đổi được row sang USED; vì vậy chỉ một request nhận VALID.
     */
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

    /*
     * Zero row nghĩa là Ticket không còn ISSUED. Phải đọc lại vì lần đọc trước
     * không lấy status và dù có lấy thì cũng có thể stale do scanner khác vừa
     * commit. USED được phân loại ALREADY_USED; VOID/mất row là INVALID.
     */
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
