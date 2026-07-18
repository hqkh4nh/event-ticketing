import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { CreateEventDto } from './dto/create-event.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import {
  OrganizerEventDto,
  OrganizerEventSummaryDto,
} from './dto/organizer-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { EventsOrganizerService } from './events-organizer.service';

@ApiTags('organizer-events')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'code: FORBIDDEN_ROLE | ACCOUNT_PENDING_APPROVAL',
})
@Roles('ORGANIZER')
@UseGuards(RolesGuard)
@Controller('organizer/events')
export class EventsOrganizerController {
  constructor(private readonly events: EventsOrganizerService) {}

  @Get()
  @ApiOperation({ summary: 'List my events (any status)' })
  @ApiOkResponse({ type: OrganizerEventSummaryDto, isArray: true })
  list(
    @CurrentUser() user: CurrentUserData,
  ): Promise<OrganizerEventSummaryDto[]> {
    return this.events.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft event' })
  @ApiCreatedResponse({ type: OrganizerEventDto })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateEventDto,
  ): Promise<OrganizerEventDto> {
    return this.events.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my events' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  get(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OrganizerEventDto> {
    return this.events.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an event (draft or published)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<OrganizerEventDto> {
    return this.events.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.events.remove(user.id, id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an event (needs >= 1 ticket type)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiConflictResponse({
    description: 'code: EVENT_NOT_PUBLISHABLE | INVALID_STATE_TRANSITION',
  })
  publish(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OrganizerEventDto> {
    return this.events.publish(user.id, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a published event back to draft' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  unpublish(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OrganizerEventDto> {
    return this.events.unpublish(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a published event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  cancel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OrganizerEventDto> {
    return this.events.cancel(user.id, id);
  }

  @Post(':id/ticket-types')
  @ApiOperation({ summary: 'Add a ticket type' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: OrganizerEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  addTicketType(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: CreateTicketTypeDto,
  ): Promise<OrganizerEventDto> {
    return this.events.addTicketType(user.id, id, dto);
  }

  @Patch(':id/ticket-types/:typeId')
  @ApiOperation({ summary: 'Edit a ticket type' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'typeId', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  updateTicketType(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateTicketTypeDto,
  ): Promise<OrganizerEventDto> {
    return this.events.updateTicketType(user.id, id, typeId, dto);
  }

  @Delete(':id/ticket-types/:typeId')
  @ApiOperation({ summary: 'Delete a ticket type' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'typeId', format: 'uuid' })
  @ApiOkResponse({ type: OrganizerEventDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: LAST_TICKET_TYPE' })
  removeTicketType(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
  ): Promise<OrganizerEventDto> {
    return this.events.removeTicketType(user.id, id, typeId);
  }
}
