import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/jwt.strategy';
import {
  CompleteUploadRequestDto,
  UploadRequestDto,
} from './dto/upload-request.dto';
import {
  CompleteUploadDto,
  UploadSignatureDto,
} from './dto/upload-response.dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a signed direct-image upload request' })
  @ApiOkResponse({ type: UploadSignatureDto })
  @ApiServiceUnavailableResponse({
    description: 'code: MEDIA_UPLOAD_UNAVAILABLE',
  })
  @ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  signature(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UploadRequestDto,
  ): Promise<UploadSignatureDto> {
    return this.uploads.createSignature(user, dto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an uploaded image and save its URL' })
  @ApiOkResponse({ type: CompleteUploadDto })
  @ApiBadGatewayResponse({ description: 'code: MEDIA_UPLOAD_FAILED' })
  @ApiServiceUnavailableResponse({
    description: 'code: MEDIA_UPLOAD_UNAVAILABLE',
  })
  @ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  complete(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CompleteUploadRequestDto,
  ): Promise<CompleteUploadDto> {
    return this.uploads.completeUpload(user, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an uploaded image and clear its saved URL' })
  @ApiNoContentResponse()
  @ApiBadGatewayResponse({ description: 'code: MEDIA_DELETE_FAILED' })
  @ApiServiceUnavailableResponse({
    description: 'code: MEDIA_UPLOAD_UNAVAILABLE',
  })
  @ApiForbiddenResponse({ description: 'code: FORBIDDEN_ROLE' })
  @ApiNotFoundResponse({ description: 'code: NOT_FOUND' })
  remove(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UploadRequestDto,
  ): Promise<void> {
    return this.uploads.deleteUpload(user, dto);
  }
}
