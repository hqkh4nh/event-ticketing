import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../common/errors/error-code';
import { EventStatus, Prisma, UserStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminEventDto, AdminEventListDto } from './dto/admin-event.dto';
import {
  AdminOrganizerDto,
  AdminOrganizerListDto,
} from './dto/admin-organizer.dto';
import { ListAdminEventsQueryDto } from './dto/list-admin-events-query.dto';
import { ListAdminOrganizersQueryDto } from './dto/list-admin-organizers-query.dto';
import { UpdateEventFeaturedDto } from './dto/update-event-featured.dto';
import {
  AdminOrganizerStatus,
  UpdateOrganizerStatusDto,
} from './dto/update-organizer-status.dto';

const organizerSelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { events: true } },
} satisfies Prisma.UserSelect;

type OrganizerRow = Prisma.UserGetPayload<{
  select: typeof organizerSelect;
}>;

const adminEventSelect = {
  id: true,
  organizerId: true,
  title: true,
  venue: true,
  status: true,
  featured: true,
  startAt: true,
  organizer: { select: { fullName: true } },
  ticketTypes: {
    select: {
      quantityTotal: true,
      orderItems: {
        where: { order: { status: 'PAID' } },
        select: { quantity: true },
      },
    },
  },
} satisfies Prisma.EventSelect;

type AdminEventRow = Prisma.EventGetPayload<{
  select: typeof adminEventSelect;
}>;

export function assertAdminApprovalTransition(status: EventStatus): void {
  if (status !== EventStatus.PENDING_REVIEW) {
    throw new ConflictException({
      code: ErrorCode.INVALID_STATE_TRANSITION,
      message: 'Only events waiting for review can be approved.',
    });
  }
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminService.name);
  }

  async listOrganizers(
    query: ListAdminOrganizersQueryDto,
  ): Promise<AdminOrganizerListDto> {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: 'ORGANIZER',
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: organizerSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map(toAdminOrganizerDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateOrganizerStatus(
    adminId: string,
    organizerId: string,
    dto: UpdateOrganizerStatusDto,
  ): Promise<AdminOrganizerDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id: organizerId, role: 'ORGANIZER' },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Organizer not found.',
      });
    }

    const organizer = await this.prisma.user.update({
      where: { id: organizerId },
      data: { status: dto.status },
      select: organizerSelect,
    });

    this.logStatusChange(adminId, organizerId, existing.status, dto.status);

    return toAdminOrganizerDto(organizer);
  }

  async listEvents(query: ListAdminEventsQueryDto): Promise<AdminEventListDto> {
    const search = query.search?.trim();
    const where: Prisma.EventWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              {
                organizer: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        select: adminEventSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: rows.map(toAdminEventDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateEventFeatured(
    adminId: string,
    eventId: string,
    dto: UpdateEventFeaturedDto,
  ): Promise<AdminEventDto> {
    const event = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.event.findUnique({
        where: { id: eventId },
        select: adminEventSelect,
      });
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Event not found.',
        });
      }

      if (dto.featured && existing.status !== EventStatus.PUBLISHED) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'Only published events can be featured.',
        });
      }

      if (existing.featured === dto.featured) return existing;

      const changed = await tx.event.updateMany({
        where: {
          id: eventId,
          featured: existing.featured,
          ...(dto.featured ? { status: EventStatus.PUBLISHED } : {}),
        },
        data: { featured: dto.featured },
      });

      if (changed.count !== 1) {
        const current = await tx.event.findUniqueOrThrow({
          where: { id: eventId },
          select: adminEventSelect,
        });
        if (dto.featured && current.status !== EventStatus.PUBLISHED) {
          throw new ConflictException({
            code: ErrorCode.INVALID_STATE_TRANSITION,
            message: 'Only published events can be featured.',
          });
        }
        return current;
      }

      if (dto.featured) {
        await tx.notification.create({
          data: {
            userId: existing.organizerId,
            type: 'EVENT_FEATURED',
            data: {
              eventId: existing.id,
              eventTitle: existing.title,
              url: `/organizer/events/${existing.id}`,
            },
          },
        });
      }

      return tx.event.findUniqueOrThrow({
        where: { id: eventId },
        select: adminEventSelect,
      });
    });

    this.logger.info(
      { adminId, eventId, featured: event.featured },
      'Admin updated event featured status',
    );

    return toAdminEventDto(event);
  }

  async approveEvent(adminId: string, eventId: string): Promise<AdminEventDto> {
    const event = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.event.findUnique({
        where: { id: eventId },
        select: adminEventSelect,
      });
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Event not found.',
        });
      }

      assertAdminApprovalTransition(existing.status);
      const changed = await tx.event.updateMany({
        where: { id: eventId, status: EventStatus.PENDING_REVIEW },
        data: { status: EventStatus.PUBLISHED },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'The event is no longer waiting for review.',
        });
      }

      await tx.notification.create({
        data: {
          userId: existing.organizerId,
          type: 'EVENT_APPROVED',
          data: {
            eventId: existing.id,
            eventTitle: existing.title,
            url: `/organizer/events/${existing.id}`,
          },
        },
      });

      return tx.event.findUniqueOrThrow({
        where: { id: eventId },
        select: adminEventSelect,
      });
    });

    this.logger.info({ adminId, eventId }, 'Admin approved event publication');
    return toAdminEventDto(event);
  }

  private logStatusChange(
    adminId: string,
    organizerId: string,
    previousStatus: UserStatus,
    nextStatus: AdminOrganizerStatus,
  ): void {
    this.logger.info(
      { adminId, organizerId, previousStatus, nextStatus },
      'Admin updated organizer status',
    );
  }
}

function toAdminOrganizerDto(row: OrganizerRow): AdminOrganizerDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    status: row.status,
    eventCount: row._count.events,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAdminEventDto(row: AdminEventRow): AdminEventDto {
  return {
    id: row.id,
    organizerId: row.organizerId,
    organizerName: row.organizer.fullName,
    title: row.title,
    venue: row.venue,
    status: row.status,
    featured: row.featured,
    startAt: row.startAt.toISOString(),
    sold: row.ticketTypes.reduce(
      (total, ticketType) =>
        total +
        ticketType.orderItems.reduce(
          (ticketTotal, item) => ticketTotal + item.quantity,
          0,
        ),
      0,
    ),
    capacity: row.ticketTypes.reduce(
      (total, ticketType) => total + ticketType.quantityTotal,
      0,
    ),
  };
}
