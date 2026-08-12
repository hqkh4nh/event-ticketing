import { BadRequestException, Injectable } from '@nestjs/common';

import {
  EventStatus,
  Locale,
  OrderStatus,
  Prisma,
} from '../../generated/prisma';
import { ErrorCode } from '../../common/errors/error-code';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DailySalesStatisticDto,
  SalesStatisticsDto,
  TopEventStatisticDto,
} from './dto/sales-statistics.dto';
import type { RevenueReportQueryDto } from './dto/revenue-report-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 30;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_REPORT_DAYS = 366;

export type RevenueReportFile = {
  filename: string;
  content: string;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  getAdminStatistics(): Promise<SalesStatisticsDto> {
    return this.getStatistics();
  }

  getOrganizerStatistics(organizerId: string): Promise<SalesStatisticsDto> {
    return this.getStatistics(organizerId);
  }

  exportAdminRevenueReport(
    query: RevenueReportQueryDto,
    locale: Locale,
  ): Promise<RevenueReportFile> {
    return this.exportRevenueReport(query, locale);
  }

  exportOrganizerRevenueReport(
    organizerId: string,
    query: RevenueReportQueryDto,
    locale: Locale,
  ): Promise<RevenueReportFile> {
    return this.exportRevenueReport(query, locale, organizerId);
  }

  private async exportRevenueReport(
    query: RevenueReportQueryDto,
    locale: Locale,
    organizerId?: string,
  ): Promise<RevenueReportFile> {
    // Chuẩn hóa range một lần để SUMMARY và DETAIL dùng cùng biên thời gian.
    const range = parseRevenueReportRange(query.from, query.to);
    const content =
      query.type === 'SUMMARY'
        ? await this.buildSummaryCsv(range, locale, organizerId)
        : await this.buildDetailCsv(range, locale, organizerId);

    return {
      filename: `revenue-${query.type.toLowerCase()}_${query.from}_${query.to}.csv`,
      content,
    };
  }

  private async buildSummaryCsv(
    range: RevenueReportRange,
    locale: Locale,
    organizerId?: string,
  ): Promise<string> {
    /*
     * Aggregate Order theo event trước để database tính doanh thu/số đơn. Chỉ
     * khi có eventId mới chạy tiếp aggregate quantity và lấy title; tránh query
     * thừa cho báo cáo rỗng.
     */
    const orderWhere = buildRevenueOrderWhere(range, organizerId);
    const orderGroups = await this.prisma.order.groupBy({
      by: ['eventId'],
      where: orderWhere,
      _sum: { totalVnd: true },
      _count: { id: true },
      orderBy: [{ _sum: { totalVnd: 'desc' } }, { eventId: 'asc' }],
    });
    const eventIds = orderGroups.map((row) => row.eventId);
    const [ticketGroups, events] = eventIds.length
      ? await Promise.all([
          this.prisma.orderItem.groupBy({
            by: ['eventId'],
            where: { order: orderWhere },
            _sum: { quantity: true },
          }),
          this.prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, title: true },
          }),
        ])
      : [[], []];
    // Map ghép ba tập aggregate theo eventId mà không tạo vòng lặp lồng nhau.
    const ticketsByEvent = new Map(
      ticketGroups.map((row) => [row.eventId, row._sum.quantity ?? 0]),
    );
    const namesByEvent = new Map(
      events.map((event) => [event.id, event.title]),
    );
    const headers =
      locale === Locale.VI
        ? [
            'Tên sự kiện',
            'Số đơn đã thanh toán',
            'Số vé đã bán',
            'Doanh thu (VND)',
          ]
        : ['Event', 'Paid orders', 'Tickets sold', 'Revenue (VND)'];
    const rows = orderGroups.flatMap((group) => {
      const title = namesByEvent.get(group.eventId);
      if (!title) return [];
      return [
        [
          title,
          group._count.id,
          ticketsByEvent.get(group.eventId) ?? 0,
          group._sum.totalVnd ?? 0n,
        ],
      ];
    });

    return buildCsv([headers, ...rows]);
  }

  private async buildDetailCsv(
    range: RevenueReportRange,
    locale: Locale,
    organizerId?: string,
  ): Promise<string> {
    /*
     * DETAIL lấy một Order rồi flatMap thành một dòng cho mỗi OrderItem. Thành
     * tiền được tính bằng bigint `unitPrice * quantity`, không dùng number để
     * tránh làm tròn dữ liệu tài chính trước khi ghi CSV.
     */
    const orders = await this.prisma.order.findMany({
      where: buildRevenueOrderWhere(range, organizerId),
      select: {
        id: true,
        transferCode: true,
        paidAt: true,
        event: { select: { title: true } },
        items: {
          select: {
            quantity: true,
            unitPriceVnd: true,
            ticketType: { select: { name: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
    });
    const headers =
      locale === Locale.VI
        ? [
            'Ngày thanh toán',
            'Mã đơn',
            'Sự kiện',
            'Hạng vé',
            'Số lượng',
            'Đơn giá (VND)',
            'Thành tiền (VND)',
          ]
        : [
            'Paid at',
            'Order code',
            'Event',
            'Ticket type',
            'Quantity',
            'Unit price (VND)',
            'Amount (VND)',
          ];
    const rows = orders.flatMap((order) => {
      const paidAt = order.paidAt;
      if (!paidAt) return [];
      return order.items.map((item) => {
        return [
          formatVietnamDateTime(paidAt),
          order.transferCode,
          order.event.title,
          item.ticketType.name,
          item.quantity,
          item.unitPriceVnd,
          item.unitPriceVnd * BigInt(item.quantity),
        ];
      });
    });

    return buildCsv([headers, ...rows]);
  }

  private async getStatistics(
    organizerId?: string,
  ): Promise<SalesStatisticsDto> {
    const now = new Date();
    const rangeStart = getRangeStart(now);
    const allTimeOrderWhere = buildPaidOrderWhere(organizerId);
    const rangeOrderWhere = buildPaidOrderWhere(organizerId, rangeStart, now);
    const eventWhere: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      ...(organizerId ? { organizerId } : {}),
    };

    /*
     * Các aggregate độc lập chạy song song để giảm tổng latency. allTime dùng
     * cho KPI tổng; range 30 ngày dùng cho biểu đồ và top events. organizerId
     * là optional scope: có ID thì chỉ thống kê event của Organizer, không có
     * thì Admin xem toàn nền tảng.
     */
    const [
      orderSummary,
      ticketSummary,
      publishedEvents,
      dailyOrders,
      topOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: allTimeOrderWhere,
        _sum: { totalVnd: true },
        _count: { id: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { order: allTimeOrderWhere },
        _sum: { quantity: true },
      }),
      this.prisma.event.count({ where: eventWhere }),
      this.getDailyStatistics(rangeStart, now, organizerId),
      this.prisma.order.groupBy({
        by: ['eventId'],
        where: rangeOrderWhere,
        _sum: { totalVnd: true },
        _count: { id: true },
        orderBy: [{ _sum: { totalVnd: 'desc' } }, { eventId: 'asc' }],
        take: 5,
      }),
    ]);

    const topEventIds = topOrders.map((row) => row.eventId);
    const [topTicketCounts, topEventNames] = topEventIds.length
      ? await Promise.all([
          this.prisma.orderItem.groupBy({
            by: ['eventId'],
            where: {
              eventId: { in: topEventIds },
              order: rangeOrderWhere,
            },
            _sum: { quantity: true },
          }),
          this.prisma.event.findMany({
            where: { id: { in: topEventIds } },
            select: { id: true, title: true },
          }),
        ])
      : [[], []];

    return {
      summary: {
        paidRevenueVnd: toNumber(orderSummary._sum.totalVnd),
        ticketsSold: ticketSummary._sum.quantity ?? 0,
        paidOrders: orderSummary._count.id,
        publishedEvents,
      },
      daily: buildDailySeries(dailyOrders, rangeStart),
      topEvents: buildTopEvents(topOrders, topTicketCounts, topEventNames),
    };
  }

  private getDailyStatistics(
    rangeStart: Date,
    now: Date,
    organizerId?: string,
  ): Promise<DailyAggregateRow[]> {
    /*
     * Prisma groupBy không thuận tiện cho DATE theo timezone, nên dùng raw SQL.
     * `AT TIME ZONE Asia/Ho_Chi_Minh` bảo đảm giao dịch gần nửa đêm được xếp vào
     * đúng ngày Việt Nam thay vì ngày UTC. Prisma.sql parameter hóa organizerId,
     * không nối chuỗi input trực tiếp nên tránh SQL injection.
     */
    const organizerFilter = organizerId
      ? Prisma.sql`AND e."organizerId" = CAST(${organizerId} AS UUID)`
      : Prisma.empty;

    return this.prisma.$queryRaw<DailyAggregateRow[]>(Prisma.sql`
      SELECT
        TO_CHAR(o."paidAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS "date",
        COALESCE(SUM(o."totalVnd"), 0)::bigint AS "revenueVnd",
        COALESCE(SUM(order_items."ticketsSold"), 0)::bigint AS "ticketsSold"
      FROM "Order" o
      INNER JOIN "Event" e ON e."id" = o."eventId"
      LEFT JOIN LATERAL (
        SELECT SUM(oi."quantity")::bigint AS "ticketsSold"
        FROM "OrderItem" oi
        WHERE oi."orderId" = o."id"
      ) order_items ON TRUE
      WHERE o."status" = CAST(${OrderStatus.PAID} AS "OrderStatus")
        AND o."paidAt" >= ${rangeStart}
        AND o."paidAt" <= ${now}
        ${organizerFilter}
      GROUP BY TO_CHAR(o."paidAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
      ORDER BY "date" ASC
    `);
  }
}

type DailyAggregateRow = {
  date: string;
  revenueVnd: bigint;
  ticketsSold: bigint;
};

function buildPaidOrderWhere(
  organizerId?: string,
  from?: Date,
  to?: Date,
): Prisma.OrderWhereInput {
  return {
    status: OrderStatus.PAID,
    ...(organizerId ? { event: { organizerId } } : {}),
    ...(from && to ? { paidAt: { gte: from, lte: to } } : {}),
  };
}

type RevenueReportRange = {
  start: Date;
  endExclusive: Date;
};

function buildRevenueOrderWhere(
  range: RevenueReportRange,
  organizerId?: string,
): Prisma.OrderWhereInput {
  return {
    status: OrderStatus.PAID,
    ...(organizerId ? { event: { organizerId } } : {}),
    paidAt: { gte: range.start, lt: range.endExclusive },
  };
}

function parseRevenueReportRange(from: string, to: string): RevenueReportRange {
  /*
   * Query nhập ngày không có giờ theo lịch Việt Nam. `to` phải bao gồm trọn ngày
   * nên query dùng [start, endExclusive), với endExclusive là đầu ngày kế tiếp.
   */
  const start = parseVietnamDate(from);
  const end = parseVietnamDate(to);
  const endExclusive = new Date(end.getTime() + DAY_MS);
  const days = (endExclusive.getTime() - start.getTime()) / DAY_MS;

  if (start > end || days > MAX_REPORT_DAYS) {
    throw invalidReportRange();
  }

  return { start, endExclusive };
}

function parseVietnamDate(value: string): Date {
  /*
   * Không dựa vào Date parser mơ hồ của runtime. Tự tách YYYY-MM-DD, quy đổi
   * 00:00 Việt Nam sang UTC rồi round-trip lại để loại ngày không tồn tại như
   * 2026-02-30.
   */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalidReportRange();
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day) - VIETNAM_OFFSET_MS);
  if (toVietnamDateKey(date) !== value) throw invalidReportRange();
  return date;
}

function invalidReportRange(): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: `Report date range must be valid and no longer than ${MAX_REPORT_DAYS} days.`,
  });
}

function formatVietnamDateTime(date: Date): string {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

function buildCsv(rows: Array<Array<string | number | bigint>>): string {
  /*
   * CRLF tương thích tốt với spreadsheet; UTF-8 BOM giúp Excel nhận tiếng Việt
   * đúng encoding. Mỗi cell vẫn đi qua escapeCsvValue trước khi nối.
   */
  const content = rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');
  return `\uFEFF${content}\r\n`;
}

function escapeCsvValue(value: string | number | bigint): string {
  const text = String(value);
  /*
   * Tên event/hạng vé do Organizer nhập. Nếu cell bắt đầu bằng =,+,-,@, tab,
   * newline hoặc biến thể full-width, spreadsheet có thể coi là công thức.
   * Prefix apostrophe buộc nó thành text; dấu quote bên trong được nhân đôi theo
   * chuẩn CSV và toàn bộ cell luôn được bọc trong double quote.
   */
  const spreadsheetSafe =
    typeof value === 'string' &&
    /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/u.test(text)
      ? `'${text}`
      : text;
  return `"${spreadsheetSafe.replace(/"/g, '""')}"`;
}

function getRangeStart(now: Date): Date {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const vietnamMidnightUtc = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
  );
  return new Date(
    vietnamMidnightUtc - VIETNAM_OFFSET_MS - (RANGE_DAYS - 1) * DAY_MS,
  );
}

function toVietnamDateKey(date: Date): string {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function buildDailySeries(
  rows: DailyAggregateRow[],
  rangeStart: Date,
): DailySalesStatisticDto[] {
  /*
   * SQL chỉ trả ngày có giao dịch. Khởi tạo đủ 30 ngày bằng zero trước rồi mới
   * overlay aggregate để biểu đồ có trục thời gian liên tục, không nhảy/mất ngày.
   */
  const byDate = new Map<string, DailySalesStatisticDto>();

  for (let index = 0; index < RANGE_DAYS; index += 1) {
    const date = toVietnamDateKey(
      new Date(rangeStart.getTime() + index * DAY_MS),
    );
    byDate.set(date, { date, revenueVnd: 0, ticketsSold: 0 });
  }

  for (const row of rows) {
    const day = byDate.get(row.date);
    if (!day) continue;
    day.revenueVnd = toNumber(row.revenueVnd);
    day.ticketsSold = toNumber(row.ticketsSold);
  }

  return [...byDate.values()];
}

function buildTopEvents(
  orderGroups: Array<{
    eventId: string;
    _sum: { totalVnd: bigint | null };
    _count: { id: number };
  }>,
  ticketGroups: Array<{
    eventId: string;
    _sum: { quantity: number | null };
  }>,
  events: Array<{ id: string; title: string }>,
): TopEventStatisticDto[] {
  const ticketsByEvent = new Map(
    ticketGroups.map((row) => [row.eventId, row._sum.quantity ?? 0]),
  );
  const namesByEvent = new Map(events.map((event) => [event.id, event.title]));

  return orderGroups.flatMap((row) => {
    const title = namesByEvent.get(row.eventId);
    if (!title) return [];
    return [
      {
        id: row.eventId,
        title,
        revenueVnd: toNumber(row._sum.totalVnd),
        ticketsSold: ticketsByEvent.get(row.eventId) ?? 0,
        paidOrders: row._count.id,
      },
    ];
  });
}

function toNumber(value: bigint | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}
