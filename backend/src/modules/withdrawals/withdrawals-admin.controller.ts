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
import { ListAdminWithdrawalsQueryDto } from './dto/list-admin-withdrawals-query.dto';
import { MarkWithdrawalPaidDto } from './dto/mark-withdrawal-paid.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { WithdrawalDto, WithdrawalListDto } from './dto/withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('admin-withdrawals')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
@Roles('ADMIN')
@UseGuards(RolesGuard)
@Controller('admin/withdrawals')
export class WithdrawalsAdminController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Get()
  @ApiOperation({ summary: 'List withdrawal requests for manual processing.' })
  @ApiOkResponse({ type: WithdrawalListDto })
  list(
    @Query() query: ListAdminWithdrawalsQueryDto,
  ): Promise<WithdrawalListDto> {
    return this.withdrawals.listForAdmin(query);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a withdrawal request so it can be transferred.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WithdrawalDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  approve(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<WithdrawalDto> {
    return this.withdrawals.approve(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a withdrawal request with a reason.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WithdrawalDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  reject(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
  ): Promise<WithdrawalDto> {
    return this.withdrawals.reject(user.id, id, dto);
  }

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record that the approved amount has been transferred by hand.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WithdrawalDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  markPaid(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: MarkWithdrawalPaidDto,
  ): Promise<WithdrawalDto> {
    return this.withdrawals.markPaid(user.id, id, dto);
  }
}
