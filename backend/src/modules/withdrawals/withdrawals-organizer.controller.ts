import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals-query.dto';
import { WithdrawalBalanceDto } from './dto/withdrawal-balance.dto';
import { WithdrawalDto, WithdrawalListDto } from './dto/withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('organizer-withdrawals')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'code: FORBIDDEN_ROLE | ACCOUNT_PENDING_APPROVAL',
})
@Roles('ORGANIZER')
@UseGuards(RolesGuard)
@Controller('organizer/withdrawals')
export class WithdrawalsOrganizerController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Get('balance')
  @ApiOperation({
    summary: 'Read the withdrawable balance from events that have ended.',
  })
  @ApiOkResponse({ type: WithdrawalBalanceDto })
  getBalance(
    @CurrentUser() user: CurrentUserData,
  ): Promise<WithdrawalBalanceDto> {
    return this.withdrawals.getBalance(user.id);
  }

  @Get()
  @ApiOperation({ summary: "List the organizer's own withdrawal requests." })
  @ApiOkResponse({ type: WithdrawalListDto })
  list(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListWithdrawalsQueryDto,
  ): Promise<WithdrawalListDto> {
    return this.withdrawals.listForOrganizer(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a withdrawal request for admin review.' })
  @ApiCreatedResponse({ type: WithdrawalDto })
  @ApiBadRequestResponse({
    description: 'code: VALIDATION_FAILED | WITHDRAWAL_AMOUNT_TOO_SMALL',
  })
  @ApiConflictResponse({
    description:
      'code: WITHDRAWAL_REQUEST_ALREADY_OPEN | WITHDRAWAL_AMOUNT_EXCEEDS_BALANCE',
  })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WithdrawalDto> {
    return this.withdrawals.create(user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a withdrawal request still under review.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WithdrawalDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  cancel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<WithdrawalDto> {
    return this.withdrawals.cancel(user.id, id);
  }
}
