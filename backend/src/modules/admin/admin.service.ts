import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../common/errors/error-code';
import { Prisma, UserStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminOrganizerDto,
  AdminOrganizerListDto,
} from './dto/admin-organizer.dto';
import { ListAdminOrganizersQueryDto } from './dto/list-admin-organizers-query.dto';
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
