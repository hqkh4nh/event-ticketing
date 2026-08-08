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
import { ListPaymentReviewsQueryDto } from './dto/list-payment-reviews-query.dto';
import {
  PaymentReviewDto,
  PaymentReviewListDto,
} from './dto/payment-review.dto';
import { ResolvePaymentDto } from './dto/resolve-payment.dto';
import { PaymentReviewsService } from './payment-reviews.service';

@ApiTags('admin-payments')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
@Roles('ADMIN')
@UseGuards(RolesGuard)
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly reviews: PaymentReviewsService) {}

  @Get('review')
  @ApiOperation({
    summary: 'List transfers that arrived without issuing a ticket.',
  })
  @ApiOkResponse({ type: PaymentReviewListDto })
  list(
    @Query() query: ListPaymentReviewsQueryDto,
  ): Promise<PaymentReviewListDto> {
    return this.reviews.list(query);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a reconciliation case with a note on what was done.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentReviewDto })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  @ApiConflictResponse({ description: 'code: INVALID_STATE_TRANSITION' })
  resolve(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: ResolvePaymentDto,
  ): Promise<PaymentReviewDto> {
    return this.reviews.resolve(user.id, id, dto);
  }
}
