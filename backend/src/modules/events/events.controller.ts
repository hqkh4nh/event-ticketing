import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { EventDetailDto, EventSummaryDto } from './dto/event-response.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Public()
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List upcoming published events' })
  @ApiOkResponse({ type: EventSummaryDto, isArray: true })
  findAll(@Query() query: ListEventsQueryDto): Promise<EventSummaryDto[]> {
    return this.events.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: EventDetailDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  findOne(@Param('id') id: string): Promise<EventDetailDto> {
    return this.events.findOne(id);
  }
}
