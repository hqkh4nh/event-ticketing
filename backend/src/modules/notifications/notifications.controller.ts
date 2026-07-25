import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NotificationDto,
  NotificationListDto,
  UnreadNotificationCountDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ type: NotificationListDto })
  list(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListDto> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the current unread notification count' })
  @ApiOkResponse({ type: UnreadNotificationCountDto })
  unreadCount(
    @CurrentUser() user: CurrentUserData,
  ): Promise<UnreadNotificationCountDto> {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: NotificationDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  markRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<NotificationDto> {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiNoContentResponse()
  markAllRead(@CurrentUser() user: CurrentUserData): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }
}
