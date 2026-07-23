import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateStaffDto } from './dto/create-staff.dto';
import {
  CreateStaffResponseDto,
  ReconnectResponseDto,
  StaffDeviceDto,
} from './dto/staff-device.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('organizer-staff')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'code: FORBIDDEN_ROLE | ACCOUNT_PENDING_APPROVAL',
})
@Roles('ORGANIZER')
@UseGuards(RolesGuard)
@Controller('organizer')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Post('events/:eventId/staff')
  @ApiOperation({
    summary:
      'Create a scanner device for my event; returns its one-time connect code.',
  })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiCreatedResponse({ type: CreateStaffResponseDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  create(
    @CurrentUser() user: CurrentUserData,
    @Param('eventId') eventId: string,
    @Body() dto: CreateStaffDto,
  ): Promise<CreateStaffResponseDto> {
    return this.staff.createDevice(user.id, eventId, dto.label);
  }

  @Get('events/:eventId/staff')
  @ApiOperation({ summary: 'List scanner devices assigned to my event.' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: StaffDeviceDto, isArray: true })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  list(
    @CurrentUser() user: CurrentUserData,
    @Param('eventId') eventId: string,
  ): Promise<StaffDeviceDto[]> {
    return this.staff.listDevices(user.id, eventId);
  }

  @Post('staff/:id/reconnect')
  @ApiOperation({
    summary:
      'Issue a fresh one-time connect code for a device; any unredeemed code dies.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ReconnectResponseDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  reconnect(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<ReconnectResponseDto> {
    return this.staff.reconnect(user.id, id);
  }

  @Patch('staff/:id')
  @ApiOperation({ summary: 'Block/unblock a device or rename its label.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: StaffDeviceDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffDeviceDto> {
    return this.staff.updateDevice(user.id, id, dto);
  }
}
