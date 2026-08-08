import {
  Controller,
  Get,
  Headers,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';
import { SalesStatisticsDto } from './dto/sales-statistics.dto';
import { StatisticsService } from './statistics.service';

function sendCsv(
  response: Response,
  report: { filename: string; content: string },
): StreamableFile {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${report.filename}"`,
  );
  return new StreamableFile(Buffer.from(report.content, 'utf8'));
}

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

  @Get('export')
  @ApiOperation({ summary: 'Export a platform-wide revenue CSV report.' })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async export(
    @CurrentUser() user: CurrentUserData,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Query() query: RevenueReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const report = await this.statistics.exportAdminRevenueReport(
      query,
      resolveReportLocale(acceptLanguage, user.locale),
    );
    return sendCsv(response, report);
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

  @Get('export')
  @ApiOperation({ summary: 'Export a revenue CSV report for my events.' })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async export(
    @CurrentUser() user: CurrentUserData,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Query() query: RevenueReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const report = await this.statistics.exportOrganizerRevenueReport(
      user.id,
      query,
      resolveReportLocale(acceptLanguage, user.locale),
    );
    return sendCsv(response, report);
  }
}

function resolveReportLocale(
  acceptLanguage: string | undefined,
  fallback: CurrentUserData['locale'],
): CurrentUserData['locale'] {
  const primaryLanguage = acceptLanguage
    ?.split(',', 1)[0]
    ?.trim()
    .toLowerCase();

  if (primaryLanguage?.startsWith('vi')) return 'VI';
  if (primaryLanguage?.startsWith('en')) return 'EN';
  return fallback;
}
