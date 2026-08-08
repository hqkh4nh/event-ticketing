import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { SalesStatisticsDto } from './dto/sales-statistics.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
@Roles('ADMIN')
@UseGuards(RolesGuard)
@Controller('admin/statistics')
export class AdminStatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform-wide sales statistics.' })
  @ApiOkResponse({ type: SalesStatisticsDto })
  get(): Promise<SalesStatisticsDto> {
    return this.statistics.getAdminStatistics();
  }
}

@ApiTags('organizer-statistics')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'code: FORBIDDEN_ROLE | ACCOUNT_PENDING_APPROVAL',
})
@Roles('ORGANIZER')
@UseGuards(RolesGuard)
@Controller('organizer/statistics')
export class OrganizerStatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get sales statistics for my events.' })
  @ApiOkResponse({ type: SalesStatisticsDto })
  get(@CurrentUser() user: CurrentUserData): Promise<SalesStatisticsDto> {
    return this.statistics.getOrganizerStatistics(user.id);
  }
}
