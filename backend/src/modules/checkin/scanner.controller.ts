import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { CheckinService } from './checkin.service';
import { ScannerEventDto } from './dto/scanner-event.dto';

@ApiTags('scanner')
@ApiBearerAuth()
@Controller('scanner/events')
@Roles('SCANNER', 'ADMIN')
@UseGuards(RolesGuard)
export class ScannerController {
  constructor(private readonly checkin: CheckinService) {}

  @Get()
  @ApiOperation({ summary: 'List events the current scanner is assigned to.' })
  @ApiOkResponse({ type: [ScannerEventDto] })
  listAssigned(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ScannerEventDto[]> {
    return this.checkin.listAssignedEvents(user.id);
  }
}
