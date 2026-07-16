import { Injectable, NotFoundException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { EventDetailDto, EventSummaryDto } from './dto/event-response.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListEventsQueryDto): Promise<EventSummaryDto[]> {
    const search = query.search?.trim();
    const city = query.city?.trim();
    const where: Prisma.EventWhereInput = {
      status: 'PUBLISHED',
      startAt: { gte: new Date() },
      ...(query.category ? { category: query.category } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        title: true,
        city: true,
        startAt: true,
        coverImageUrl: true,
        category: true,
        featured: true,
        ticketTypes: {
          orderBy: { priceVnd: 'asc' },
          take: 1,
          select: { priceVnd: true },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      city: event.city,
      startAt: event.startAt.toISOString(),
      coverImageUrl: event.coverImageUrl,
      minPriceVnd: Number(event.ticketTypes[0]?.priceVnd ?? 0n),
      category: event.category,
      featured: event.featured,
    }));
  }

  async findOne(id: string): Promise<EventDetailDto> {
    const event = await this.prisma.event.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        description: true,
        venue: true,
        city: true,
        startAt: true,
        endAt: true,
        coverImageUrl: true,
        category: true,
        featured: true,
        ticketTypes: {
          orderBy: { priceVnd: 'asc' },
          select: {
            id: true,
            name: true,
            priceVnd: true,
            quantityTotal: true,
            orderItems: {
              where: { order: { status: { in: ['PENDING', 'PAID'] } } },
              select: { quantity: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }

    const ticketTypes = event.ticketTypes.map((ticketType) => {
      const reservedQuantity = ticketType.orderItems.reduce(
        (total, item) => total + item.quantity,
        0,
      );

      return {
        id: ticketType.id,
        name: ticketType.name,
        priceVnd: Number(ticketType.priceVnd),
        quantityRemaining: Math.max(
          0,
          ticketType.quantityTotal - reservedQuantity,
        ),
      };
    });

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      city: event.city,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      coverImageUrl: event.coverImageUrl,
      minPriceVnd: ticketTypes[0]?.priceVnd ?? 0,
      category: event.category,
      featured: event.featured,
      ticketTypes,
    };
  }
}
