import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { AdminService } from './admin.service';
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
import { UpdateOrganizerStatusDto } from './dto/update-organizer-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
@Roles('ADMIN')
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('organizers')
  @ApiOperation({
    summary: 'List organizers for approval and account management.',
  })
  @ApiOkResponse({ type: AdminOrganizerListDto })
  list(
    @Query() query: ListAdminOrganizersQueryDto,
  ): Promise<AdminOrganizerListDto> {
    return this.admin.listOrganizers(query);
  }

  @Patch('organizers/:id/status')
  @ApiOperation({
    summary: 'Approve, block, or restore an organizer account.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminOrganizerDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizerStatusDto,
  ): Promise<AdminOrganizerDto> {
    return this.admin.updateOrganizerStatus(user.id, id, dto);
  }

  @Get('events')
  @ApiOperation({
    summary: 'List events for Admin moderation.',
  })
  @ApiOkResponse({ type: AdminEventListDto })
  listEvents(
    @Query() query: ListAdminEventsQueryDto,
  ): Promise<AdminEventListDto> {
    return this.admin.listEvents(query);
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Read one event in full, whatever its status.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminEventDetailDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  getEvent(@Param('id') id: string): Promise<AdminEventDetailDto> {
    return this.admin.getEvent(id);
  }

  @Patch('events/:id/featured')
  @ApiOperation({
    summary: 'Mark or unmark a published event as featured.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  updateEventFeatured(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateEventFeaturedDto,
  ): Promise<AdminEventDto> {
    return this.admin.updateEventFeatured(user.id, id, dto);
  }

  @Post('events/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an event waiting for publication review.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  approveEvent(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<AdminEventDto> {
    return this.admin.approveEvent(user.id, id);
  }

  @Post('events/:id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hide a published event and cancel its pending orders.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  hideEvent(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: HideEventDto,
  ): Promise<AdminEventDto> {
    return this.admin.hideEvent(user.id, id, dto);
  }

  @Post('events/:id/unhide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a hidden event to the public listing.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  unhideEvent(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<AdminEventDto> {
    return this.admin.unhideEvent(user.id, id);
  }
}
