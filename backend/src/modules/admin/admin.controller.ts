import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import {
  AdminOrganizerDto,
  AdminOrganizerListDto,
} from './dto/admin-organizer.dto';
import { ListAdminOrganizersQueryDto } from './dto/list-admin-organizers-query.dto';
import { UpdateOrganizerStatusDto } from './dto/update-organizer-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
@Roles('ADMIN')
@UseGuards(RolesGuard)
@Controller('admin/organizers')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @ApiOperation({
    summary: 'List organizers for approval and account management.',
  })
  @ApiOkResponse({ type: AdminOrganizerListDto })
  list(
    @Query() query: ListAdminOrganizersQueryDto,
  ): Promise<AdminOrganizerListDto> {
    return this.admin.listOrganizers(query);
  }

  @Patch(':id/status')
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
}
