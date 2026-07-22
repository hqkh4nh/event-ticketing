import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventStaffGuard } from '../auth/guards/event-staff.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { CheckinService } from './checkin.service';
import { CheckinDto } from './dto/checkin.dto';
import { CheckinResponseDto } from './dto/checkin-response.dto';

@ApiTags('checkin')
@ApiBearerAuth()
@Controller('events/:eventId/checkin')
@Roles('SCANNER', 'ADMIN')
@UseGuards(RolesGuard, EventStaffGuard)
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Scan a ticket QR at the gate. Returns VALID / ALREADY_USED / INVALID / WRONG_EVENT (always HTTP 200).',
  })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: CheckinResponseDto })
  scan(
    @Param('eventId') eventId: string,
    @Body() dto: CheckinDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CheckinResponseDto> {
    return this.checkin.checkIn(eventId, dto.qr, user.id);
  }
}
