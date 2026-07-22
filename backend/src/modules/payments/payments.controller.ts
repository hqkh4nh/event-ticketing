import { timingSafeEqual } from 'node:crypto';

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ErrorCode } from '../../common/errors/error-code';
import { Public } from '../auth/decorators/public.decorator';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('sepay/webhook')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'SePay transaction webhook. Idempotently issues tickets on payment.',
  })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
  async sepayWebhook(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: SepayWebhookDto,
  ): Promise<{ success: true }> {
    this.assertApiKey(authHeader);
    await this.payments.handleSepayWebhook(body);
    return { success: true };
  }

  /** Verifies the `Authorization: Apikey <key>` header in constant time. */
  private assertApiKey(authHeader: string | undefined): void {
    const expected = this.config.get<string>('sepay.webhookApiKey') ?? '';
    const provided = (authHeader ?? '').replace(/^Apikey\s+/i, '');
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    const valid =
      expected.length > 0 &&
      expectedBuf.length === providedBuf.length &&
      timingSafeEqual(expectedBuf, providedBuf);
    if (!valid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid webhook credentials.',
      });
    }
  }
}
