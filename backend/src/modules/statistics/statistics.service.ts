import { Injectable } from '@nestjs/common';

import { EventStatus, OrderStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DailySalesStatisticDto,
  SalesStatisticsDto,
  TopEventStatisticDto,
} from './dto/sales-statistics.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 30;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  getAdminStatistics(): Promise<SalesStatisticsDto> {
    return this.getStatistics();
  }

  getOrganizerStatistics(organizerId: string): Promise<SalesStatisticsDto> {
    return this.getStatistics(organizerId);
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
