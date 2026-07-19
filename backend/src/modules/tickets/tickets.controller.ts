import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/jwt.strategy';
import { MyTicketDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('me/tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's issued tickets." })
  @ApiOkResponse({ type: [MyTicketDto] })
  listMine(@CurrentUser() user: CurrentUserData): Promise<MyTicketDto[]> {
    return this.tickets.listMyTickets(user.id);
  }
}
