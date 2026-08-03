import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import { EventStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import {
  OrganizerEventDto,
  OrganizerEventSummaryDto,
  OrganizerTicketTypeDto,
} from './dto/organizer-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: [EventStatus.PENDING_REVIEW],
  PENDING_REVIEW: [EventStatus.DRAFT, EventStatus.PUBLISHED],
  PUBLISHED: [EventStatus.DRAFT, EventStatus.CANCELLED],
  CANCELLED: [],
  HIDDEN: [],
};

/**
 * Guards the organizer-controlled event lifecycle. Only the edges in
 * ALLOWED_TRANSITIONS are legal; every other move is a client error.
 */
export function assertTransition(from: EventStatus, to: EventStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException({
      code: ErrorCode.INVALID_STATE_TRANSITION,
      message: `Cannot move an event from ${from} to ${to}.`,
    });
  }
}

export function assertTicketQuantityNotBelowReserved(
  quantityTotal: number,
  reservedQuantity: number,
): void {
  if (quantityTotal < reservedQuantity) {
    throw new ConflictException({
      code: ErrorCode.TICKET_QUANTITY_BELOW_RESERVED,
      message: 'Ticket quantity cannot be lower than the reserved quantity.',
    });
  }
}

const ticketTypeSelect = {
  id: true,
  name: true,
  priceVnd: true,
  quantityTotal: true,
  salesStartAt: true,
  salesEndAt: true,
  orderItems: {
    where: { order: { status: { in: ['PENDING', 'PAID'] } } },
    select: { quantity: true },
  },
} satisfies Prisma.TicketTypeSelect;

type TicketTypeRow = Prisma.TicketTypeGetPayload<{
  select: typeof ticketTypeSelect;
}>;

@Injectable()
export class EventsOrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizerId: string): Promise<OrganizerEventSummaryDto[]> {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        city: true,
        category: true,
        status: true,
        featured: true,
        startAt: true,
        coverImageUrl: true,
        _count: { select: { ticketTypes: true } },
      },
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      city: event.city,
      category: event.category,
      status: event.status,
      featured: event.featured,
      startAt: event.startAt.toISOString(),
      coverImageUrl: event.coverImageUrl,
      ticketTypeCount: event._count.ticketTypes,
    }));
  }

  async get(organizerId: string, id: string): Promise<OrganizerEventDto> {
    const event = await this.loadOwnedEvent(organizerId, id);
    return this.toDetail(event.id, organizerId);
  }

  async create(
    organizerId: string,
    dto: CreateEventDto,
  ): Promise<OrganizerEventDto> {
    this.assertEventDates(dto.startAt, dto.endAt);
    const event = await this.prisma.event.create({
      data: {
        organizerId,
        title: dto.title,
        description: dto.description,
        venue: dto.venue,
        city: dto.city,
        category: dto.category,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
      select: { id: true },
    });
    return this.toDetail(event.id, organizerId);
  }

  async update(
    organizerId: string,
    id: string,
    dto: UpdateEventDto,
  ): Promise<OrganizerEventDto> {
    const event = await this.loadOwnedEvent(organizerId, id);
    this.assertEventEditable(event.status);
    const startAt = dto.startAt ?? event.startAt.toISOString();
    const endAt = dto.endAt ?? event.endAt.toISOString();
    this.assertEventDates(startAt, endAt);

    const changed = await this.prisma.event.updateMany({
      where: { id, organizerId, status: EventStatus.DRAFT },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.startAt !== undefined
          ? { startAt: new Date(dto.startAt) }
          : {}),
        ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
      },
    });
    this.assertSingleStateChange(changed.count);
    return this.toDetail(id, organizerId);
  }

  async remove(organizerId: string, id: string): Promise<void> {
    const event = await this.loadOwnedEvent(organizerId, id);
    if (event.status !== EventStatus.DRAFT) {
      throw new ConflictException({
        code: ErrorCode.INVALID_STATE_TRANSITION,
        message: 'Only draft events can be deleted.',
      });
    }
    const deleted = await this.prisma.event.deleteMany({
      where: { id, organizerId, status: EventStatus.DRAFT },
    });
    this.assertSingleStateChange(deleted.count);
  }

  async publish(organizerId: string, id: string): Promise<OrganizerEventDto> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "Event"
        WHERE id = ${id}::uuid
          AND "organizerId" = ${organizerId}::uuid
        FOR UPDATE
      `;
      const event = await tx.event.findFirst({
        where: { id, organizerId },
        select: { title: true, status: true },
      });
      if (!event) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Event not found.',
        });
      }
      assertTransition(event.status, EventStatus.PENDING_REVIEW);

      const ticketTypeCount = await tx.ticketType.count({
        where: { eventId: id },
      });
      if (ticketTypeCount === 0) {
        throw new ConflictException({
          code: ErrorCode.EVENT_NOT_PUBLISHABLE,
          message: 'An event needs at least one ticket type to be published.',
        });
      }

      const changed = await tx.event.updateMany({
        where: { id, organizerId, status: EventStatus.DRAFT },
        data: { status: EventStatus.PENDING_REVIEW },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'The event is no longer a draft.',
        });
      }

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'EVENT_SUBMITTED' as const,
            data: {
              eventId: id,
              eventTitle: event.title,
              organizerId,
              url: '/admin/events?status=PENDING_REVIEW',
            },
          })),
        });
      }
    });
    return this.toDetail(id, organizerId);
  }

  async unpublish(organizerId: string, id: string): Promise<OrganizerEventDto> {
    const event = await this.loadOwnedEvent(organizerId, id);
    assertTransition(event.status, EventStatus.DRAFT);
    const changed = await this.prisma.event.updateMany({
      where: { id, organizerId, status: event.status },
      data: { status: EventStatus.DRAFT, featured: false },
    });
    this.assertSingleStateChange(changed.count);
    return this.toDetail(id, organizerId);
  }

  async cancel(organizerId: string, id: string): Promise<OrganizerEventDto> {
    const event = await this.loadOwnedEvent(organizerId, id);
    assertTransition(event.status, EventStatus.CANCELLED);
    const changed = await this.prisma.event.updateMany({
      where: { id, organizerId, status: EventStatus.PUBLISHED },
      data: { status: EventStatus.CANCELLED, featured: false },
    });
    this.assertSingleStateChange(changed.count);
    return this.toDetail(id, organizerId);
  }

  async addTicketType(
    organizerId: string,
    eventId: string,
    dto: CreateTicketTypeDto,
  ): Promise<OrganizerEventDto> {
    this.assertSalesWindow(dto.salesStartAt, dto.salesEndAt);
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableEvent(tx, organizerId, eventId);
      await tx.ticketType.create({
        data: {
          eventId,
          name: dto.name,
          priceVnd: BigInt(dto.priceVnd),
          quantityTotal: dto.quantityTotal,
          salesStartAt: dto.salesStartAt ? new Date(dto.salesStartAt) : null,
          salesEndAt: dto.salesEndAt ? new Date(dto.salesEndAt) : null,
        },
      });
    });
    return this.toDetail(eventId, organizerId);
  }

  async updateTicketType(
    organizerId: string,
    eventId: string,
    ticketTypeId: string,
    dto: UpdateTicketTypeDto,
  ): Promise<OrganizerEventDto> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableEvent(tx, organizerId, eventId);
      await tx.$queryRaw`
        SELECT id
        FROM "TicketType"
        WHERE id = ${ticketTypeId}::uuid
          AND "eventId" = ${eventId}::uuid
        FOR UPDATE
      `;

      const existing = await tx.ticketType.findFirst({
        where: { id: ticketTypeId, eventId },
        select: { salesStartAt: true, salesEndAt: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Ticket type not found.',
        });
      }

      const salesStartAt =
        dto.salesStartAt !== undefined
          ? dto.salesStartAt
          : existing.salesStartAt?.toISOString();
      const salesEndAt =
        dto.salesEndAt !== undefined
          ? dto.salesEndAt
          : existing.salesEndAt?.toISOString();
      this.assertSalesWindow(salesStartAt, salesEndAt);

      if (dto.quantityTotal !== undefined) {
        const reserved = await tx.orderItem.aggregate({
          where: {
            eventId,
            ticketTypeId,
            order: { status: { in: ['PENDING', 'PAID'] } },
          },
          _sum: { quantity: true },
        });
        assertTicketQuantityNotBelowReserved(
          dto.quantityTotal,
          reserved._sum.quantity ?? 0,
        );
      }

      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.priceVnd !== undefined
            ? { priceVnd: BigInt(dto.priceVnd) }
            : {}),
          ...(dto.quantityTotal !== undefined
            ? { quantityTotal: dto.quantityTotal }
            : {}),
          ...(dto.salesStartAt !== undefined
            ? {
                salesStartAt: dto.salesStartAt
                  ? new Date(dto.salesStartAt)
                  : null,
              }
            : {}),
          ...(dto.salesEndAt !== undefined
            ? {
                salesEndAt: dto.salesEndAt ? new Date(dto.salesEndAt) : null,
              }
            : {}),
        },
      });
    });
    return this.toDetail(eventId, organizerId);
  }

  async removeTicketType(
    organizerId: string,
    eventId: string,
    ticketTypeId: string,
  ): Promise<OrganizerEventDto> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableEvent(tx, organizerId, eventId);
      const ticketType = await tx.ticketType.findFirst({
        where: { id: ticketTypeId, eventId },
        select: { id: true },
      });
      if (!ticketType) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Ticket type not found.',
        });
      }

      await tx.ticketType.delete({ where: { id: ticketTypeId } });
    });
    return this.toDetail(eventId, organizerId);
  }

  /**
   * Loads an event only if it belongs to the caller. A miss returns NOT_FOUND
   * rather than FORBIDDEN so one organizer cannot probe another's events.
   */
  private async loadOwnedEvent(organizerId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId },
      select: {
        id: true,
        title: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }
    return event;
  }

  private assertEventDates(startAt: string, endAt: string): void {
    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'startAt must be before endAt.',
        fields: [{ field: 'endAt', rule: 'afterStartAt' }],
      });
    }
  }

  private assertEventEditable(status: EventStatus): void {
    if (status !== EventStatus.DRAFT) {
      throw new ConflictException({
        code: ErrorCode.INVALID_STATE_TRANSITION,
        message: 'Only draft events can be edited.',
      });
    }
  }

  private async lockEditableEvent(
    tx: Prisma.TransactionClient,
    organizerId: string,
    eventId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT id
      FROM "Event"
      WHERE id = ${eventId}::uuid
        AND "organizerId" = ${organizerId}::uuid
      FOR UPDATE
    `;
    const event = await tx.event.findFirst({
      where: { id: eventId, organizerId },
      select: { status: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }
    this.assertEventEditable(event.status);
  }

  private assertSingleStateChange(count: number): void {
    if (count !== 1) {
      throw new ConflictException({
        code: ErrorCode.INVALID_STATE_TRANSITION,
        message: 'The event state changed. Please refresh and try again.',
      });
    }
  }

  private assertSalesWindow(
    salesStartAt?: string | null,
    salesEndAt?: string | null,
  ): void {
    if (
      salesStartAt &&
      salesEndAt &&
      new Date(salesStartAt).getTime() >= new Date(salesEndAt).getTime()
    ) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'salesStartAt must be before salesEndAt.',
        fields: [{ field: 'salesEndAt', rule: 'afterSalesStartAt' }],
      });
    }
  }

  private async toDetail(
    id: string,
    organizerId: string,
  ): Promise<OrganizerEventDto> {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId },
      select: {
        id: true,
        organizerId: true,
        title: true,
        description: true,
        venue: true,
        city: true,
        category: true,
        status: true,
        featured: true,
        startAt: true,
        endAt: true,
        coverImageUrl: true,
        ticketTypes: {
          orderBy: { priceVnd: 'asc' },
          select: ticketTypeSelect,
        },
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }

    const checkedInCount = await this.prisma.ticket.count({
      where: { status: 'USED', orderItem: { order: { eventId: id } } },
    });

    return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      venue: event.venue,
      city: event.city,
      category: event.category,
      status: event.status,
      featured: event.featured,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      coverImageUrl: event.coverImageUrl,
      ticketTypes: event.ticketTypes.map(toTicketTypeDto),
      checkedInCount,
    };
  }
}

function toTicketTypeDto(ticketType: TicketTypeRow): OrganizerTicketTypeDto {
  const soldCount = ticketType.orderItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  return {
    id: ticketType.id,
    name: ticketType.name,
    priceVnd: Number(ticketType.priceVnd),
    quantityTotal: ticketType.quantityTotal,
    soldCount,
    salesStartAt: ticketType.salesStartAt?.toISOString() ?? null,
    salesEndAt: ticketType.salesEndAt?.toISOString() ?? null,
  };
}
