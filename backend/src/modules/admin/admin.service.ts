import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../common/errors/error-code';
import {
  EventStatus,
  OrderStatus,
  Prisma,
  UserStatus,
} from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminEventDetailDto } from './dto/admin-event-detail.dto';
import { AdminEventDto, AdminEventListDto } from './dto/admin-event.dto';
import {
  AdminOrganizerDto,
  AdminOrganizerListDto,
} from './dto/admin-organizer.dto';
import { HideEventDto } from './dto/hide-event.dto';
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
  hiddenReason: true,
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

const adminEventDetailSelect = {
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
  hiddenReason: true,
  organizer: { select: { fullName: true, email: true } },
  ticketTypes: {
    orderBy: { priceVnd: 'asc' as const },
    select: {
      id: true,
      name: true,
      priceVnd: true,
      quantityTotal: true,
      orderItems: {
        where: { order: { status: { in: ['PENDING', 'PAID'] as const } } },
        select: { quantity: true },
      },
    },
  },
} satisfies Prisma.EventSelect;

type AdminEventDetailRow = Prisma.EventGetPayload<{
  select: typeof adminEventDetailSelect;
}>;

export function assertAdminApprovalTransition(status: EventStatus): void {
  /*
   * Chỉ Admin mới sở hữu use case approve, và chỉ event đang chờ review được
   * chuyển thành public. Hàm tách riêng giúp rule dễ đọc/test; conditional update
   * trong approveEvent vẫn cần thiết để chống thay đổi đồng thời sau bước assert.
   */
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

    /*
     * findMany và count dùng cùng `where` để items/total có cùng nghĩa. Đây là
     * batch transaction cho hai query độc lập, không phải interactive transaction
     * chứa business mutation.
     */
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

  /**
   * Full detail for moderation. Unlike the public endpoint this ignores status,
   * because the events an admin most needs to read are the ones still waiting
   * for review.
   */
  async getEvent(eventId: string): Promise<AdminEventDetailDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: adminEventDetailSelect,
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }

    /*
     * Hai aggregate độc lập nên chạy song song: revenue chỉ tính PAID; check-in
     * chỉ tính Ticket USED. Không lấy các con số này từ dữ liệu client gửi lên.
     */
    const [paidOrders, checkedInCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: { eventId, status: 'PAID' },
        _sum: { totalVnd: true },
      }),
      this.prisma.ticket.count({
        where: { status: 'USED', orderItem: { order: { eventId } } },
      }),
    ]);

    return toAdminEventDetailDto(
      event,
      Number(paidOrders._sum.totalVnd ?? 0n),
      checkedInCount,
    );
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

      // Chỉ nội dung đã được duyệt và đang public mới được đưa lên carousel.
      if (dto.featured && existing.status !== EventStatus.PUBLISHED) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'Only published events can be featured.',
        });
      }

      // Idempotent: bấm lại cùng trạng thái không ghi DB và không gửi thông báo lặp.
      if (existing.featured === dto.featured) return existing;

      /*
       * CAS so sánh cả giá trị featured đã đọc. Khi bật còn kiểm tra PUBLISHED
       * ngay trong WHERE để event bị ẩn đồng thời không thể trở thành featured.
       */
      const changed = await tx.event.updateMany({
        where: {
          id: eventId,
          featured: existing.featured,
          ...(dto.featured ? { status: EventStatus.PUBLISHED } : {}),
        },
        data: { featured: dto.featured },
      });

      if (changed.count !== 1) {
        /*
         * Nếu thua race, đọc trạng thái mới nhất. Chỉ throw khi invariant bật
         * featured bị vi phạm; trường hợp Admin khác vừa đặt đúng giá trị mong
         * muốn có thể trả current và coi như idempotent.
         */
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

      // Chỉ thông báo khi event vừa được duyệt nổi bật, không báo khi gỡ nổi bật.
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
      /*
       * Assert ở trên kiểm tra snapshot và tạo lỗi dễ hiểu; status trong WHERE
       * là CAS thực sự. Hai Admin cùng duyệt thì chỉ một request đổi được row và
       * tạo EVENT_APPROVED.
       */
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

      // Event và notification commit/rollback cùng nhau.
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

  /**
   * Takes a published event off the public listing. Pending orders are
   * cancelled in the same transaction so the held seats are released at once; a
   * transfer that arrives afterwards finds a cancelled order and lands in the
   * payment review queue rather than issuing a ticket for a blocked event.
   */
  async hideEvent(
    adminId: string,
    eventId: string,
    dto: HideEventDto,
  ): Promise<AdminEventDto> {
    const { event, cancelledOrders } = await this.prisma.$transaction(
      async (tx) => {
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

        if (existing.status !== EventStatus.PUBLISHED) {
          throw new ConflictException({
            code: ErrorCode.INVALID_STATE_TRANSITION,
            message: 'Only published events can be hidden.',
          });
        }

        /*
         * Ẩn event đồng thời bỏ featured để nó biến mất khỏi cả danh sách public
         * và carousel. hiddenReason giữ lý do moderation cho Organizer.
         */
        const changed = await tx.event.updateMany({
          where: { id: eventId, status: EventStatus.PUBLISHED },
          data: {
            status: EventStatus.HIDDEN,
            // A restored event should not walk straight back into the featured
            // rail; an admin re-picks it deliberately.
            featured: false,
            hiddenReason: dto.reason,
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException({
            code: ErrorCode.INVALID_STATE_TRANSITION,
            message: 'The event is no longer published.',
          });
        }

        /*
         * Hủy toàn bộ Order PENDING trong cùng transaction để giải phóng ghế.
         * Tiền đến sau đó sẽ gặp Order CANCELLED và đi vào payment review, không
         * cấp vé cho một event đã bị chặn.
         */
        const cancelled = await tx.order.updateMany({
          where: { eventId, status: OrderStatus.PENDING },
          data: { status: OrderStatus.CANCELLED },
        });

        await tx.notification.create({
          data: {
            userId: existing.organizerId,
            type: 'EVENT_HIDDEN',
            data: {
              eventId: existing.id,
              eventTitle: existing.title,
              reason: dto.reason,
              url: `/organizer/events/${existing.id}`,
            },
          },
        });

        return {
          event: await tx.event.findUniqueOrThrow({
            where: { id: eventId },
            select: adminEventSelect,
          }),
          cancelledOrders: cancelled.count,
        };
      },
    );

    this.logger.info(
      { adminId, eventId, cancelledOrders },
      'Admin hid event from the public listing',
    );
    return toAdminEventDto(event);
  }

  /** Restores a hidden event to the public listing, unfeatured. */
  async unhideEvent(adminId: string, eventId: string): Promise<AdminEventDto> {
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

      if (existing.status !== EventStatus.HIDDEN) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'Only hidden events can be restored.',
        });
      }

      /*
       * Khôi phục chỉ đưa event về PUBLISHED và xóa lý do ẩn. Không bật featured
       * lại vì quyết định nổi bật phải được Admin thực hiện riêng sau khi review.
       */
      const changed = await tx.event.updateMany({
        where: { id: eventId, status: EventStatus.HIDDEN },
        data: { status: EventStatus.PUBLISHED, hiddenReason: null },
      });
      if (changed.count !== 1) {
        throw new ConflictException({
          code: ErrorCode.INVALID_STATE_TRANSITION,
          message: 'The event is no longer hidden.',
        });
      }

      await tx.notification.create({
        data: {
          userId: existing.organizerId,
          type: 'EVENT_UNHIDDEN',
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

    this.logger.info({ adminId, eventId }, 'Admin restored a hidden event');
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
  // Làm phẳng `_count.events` và đổi Date runtime thành ISO string cho JSON.
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

function toAdminEventDetailDto(
  row: AdminEventDetailRow,
  revenueVnd: number,
  checkedInCount: number,
): AdminEventDetailDto {
  /*
   * Mapper kết hợp payload Prisma với hai aggregate tính riêng. soldCount ở màn
   * moderation tính cả PENDING/PAID theo select chi tiết, tức lượng đã giữ; còn
   * revenueVnd chỉ đến từ các Order PAID.
   */
  const ticketTypes = row.ticketTypes.map((ticketType) => ({
    id: ticketType.id,
    name: ticketType.name,
    priceVnd: Number(ticketType.priceVnd),
    quantityTotal: ticketType.quantityTotal,
    soldCount: ticketType.orderItems.reduce(
      (total, item) => total + item.quantity,
      0,
    ),
  }));

  return {
    id: row.id,
    organizerId: row.organizerId,
    organizerName: row.organizer.fullName,
    organizerEmail: row.organizer.email,
    title: row.title,
    description: row.description,
    venue: row.venue,
    city: row.city,
    category: row.category,
    status: row.status,
    featured: row.featured,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    coverImageUrl: row.coverImageUrl,
    hiddenReason: row.hiddenReason,
    ticketTypes,
    sold: ticketTypes.reduce((total, type) => total + type.soldCount, 0),
    capacity: ticketTypes.reduce(
      (total, type) => total + type.quantityTotal,
      0,
    ),
    revenueVnd,
    checkedInCount,
  };
}

function toAdminEventDto(row: AdminEventRow): AdminEventDto {
  // Select danh sách chỉ lấy OrderItem thuộc Order PAID nên `sold` là vé đã bán.
  return {
    id: row.id,
    organizerId: row.organizerId,
    organizerName: row.organizer.fullName,
    title: row.title,
    venue: row.venue,
    status: row.status,
    featured: row.featured,
    startAt: row.startAt.toISOString(),
    hiddenReason: row.hiddenReason,
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
