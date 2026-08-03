import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { ErrorCode } from '../../common/errors/error-code';
import { EventStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUserData } from '../auth/jwt.strategy';
import type {
  CompleteUploadDto,
  UploadSignatureDto,
} from './dto/upload-response.dto';
import { buildUploadPublicId, UploadTarget } from './upload-target';
import type {
  CompleteUploadRequestDto,
  UploadRequestDto,
} from './dto/upload-request.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_IMAGE_FORMAT_SET = new Set(ALLOWED_IMAGE_FORMATS);

type CloudinaryImageResource = {
  asset_id?: unknown;
  version?: unknown;
  secure_url?: unknown;
  bytes?: unknown;
  format?: unknown;
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createSignature(
    user: CurrentUserData,
    dto: UploadRequestDto,
  ): Promise<UploadSignatureDto> {
    const credentials = this.getCredentials();
    const publicId = await this.resolvePublicId(user, dto);
    const timestamp = Math.floor(Date.now() / 1000);
    const overwrite = true;
    const invalidate = true;
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        upload_preset: credentials.uploadPreset,
        overwrite,
        invalidate,
        allowed_formats: ALLOWED_IMAGE_FORMATS,
      },
      credentials.apiSecret,
    );

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      uploadPreset: credentials.uploadPreset,
      timestamp,
      signature,
      publicId,
      overwrite,
      invalidate,
      allowedFormats: ALLOWED_IMAGE_FORMATS,
    };
  }

  async completeUpload(
    user: CurrentUserData,
    dto: CompleteUploadRequestDto,
  ): Promise<CompleteUploadDto> {
    this.configureCloudinary();
    const publicId = await this.resolvePublicId(user, dto);
    const secureUrl = await this.verifyUploadedResource(dto, publicId);

    if (dto.target === UploadTarget.USER_AVATAR) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: secureUrl },
      });
    } else {
      const changed = await this.prisma.event.updateMany({
        where: {
          id: dto.eventId,
          organizerId: user.id,
          status: EventStatus.DRAFT,
        },
        data: { coverImageUrl: secureUrl },
      });
      this.assertDraftCoverChange(changed.count);
    }

    return { secureUrl };
  }

  async deleteUpload(
    user: CurrentUserData,
    dto: UploadRequestDto,
  ): Promise<void> {
    this.configureCloudinary();
    const publicId = await this.resolvePublicId(user, dto);

    if (dto.target === UploadTarget.EVENT_COVER) {
      const changed = await this.prisma.event.updateMany({
        where: {
          id: dto.eventId,
          organizerId: user.id,
          status: EventStatus.DRAFT,
        },
        data: { coverImageUrl: null },
      });
      this.assertDraftCoverChange(changed.count);
      await this.destroyUpload(publicId).catch(() => undefined);
      return;
    }

    await this.destroyUpload(publicId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });
  }

  private async verifyUploadedResource(
    dto: CompleteUploadRequestDto,
    publicId: string,
  ): Promise<string> {
    let resource: CloudinaryImageResource;
    try {
      resource = (await cloudinary.api.resource(publicId, {
        resource_type: 'image',
      })) as CloudinaryImageResource;
    } catch {
      throw this.uploadFailed();
    }

    const format =
      typeof resource.format === 'string'
        ? resource.format.toLowerCase()
        : undefined;
    const secureUrl = resource.secure_url;
    const resourceMatchesUpload =
      resource.asset_id === dto.assetId && resource.version === dto.version;
    if (!resourceMatchesUpload) {
      throw this.uploadFailed();
    }

    const imageIsValid =
      typeof secureUrl === 'string' &&
      typeof resource.bytes === 'number' &&
      resource.bytes <= MAX_IMAGE_BYTES &&
      typeof format === 'string' &&
      ALLOWED_IMAGE_FORMAT_SET.has(format);

    if (!imageIsValid) {
      await cloudinary.uploader
        .destroy(publicId, { invalidate: true })
        .catch(() => undefined);
      throw this.uploadFailed();
    }

    return secureUrl;
  }

  private async destroyUpload(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch {
      throw this.deleteFailed();
    }
  }

  private async resolvePublicId(
    user: CurrentUserData,
    dto: UploadRequestDto,
  ): Promise<string> {
    if (dto.target === UploadTarget.USER_AVATAR) {
      return buildUploadPublicId(dto.target, user.id);
    }

    if (user.role !== 'ORGANIZER') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN_ROLE,
        message: 'Only organizers can upload event covers.',
      });
    }

    if (!dto.eventId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }

    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, organizerId: user.id },
      select: { id: true, status: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found.',
      });
    }
    this.assertDraftEvent(event.status);

    return buildUploadPublicId(dto.target, user.id, event.id);
  }

  private assertDraftEvent(status: EventStatus): void {
    if (status !== EventStatus.DRAFT) {
      throw new ConflictException({
        code: ErrorCode.INVALID_STATE_TRANSITION,
        message: 'Only draft event covers can be changed.',
      });
    }
  }

  private assertDraftCoverChange(count: number): void {
    if (count !== 1) {
      throw new ConflictException({
        code: ErrorCode.INVALID_STATE_TRANSITION,
        message: 'The event is no longer editable.',
      });
    }
  }

  private configureCloudinary() {
    const credentials = this.getCredentials();
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  private getCredentials() {
    const cloudName = this.config.get<string>('cloudinary.cloudName') ?? '';
    const apiKey = this.config.get<string>('cloudinary.apiKey') ?? '';
    const apiSecret = this.config.get<string>('cloudinary.apiSecret') ?? '';
    const uploadPreset =
      this.config.get<string>('cloudinary.uploadPreset') ?? '';
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
      throw new ServiceUnavailableException({
        code: ErrorCode.MEDIA_UPLOAD_UNAVAILABLE,
        message: 'Image uploads are not configured.',
      });
    }
    return { cloudName, apiKey, apiSecret, uploadPreset };
  }

  private uploadFailed() {
    return new BadGatewayException({
      code: ErrorCode.MEDIA_UPLOAD_FAILED,
      message: 'The uploaded image could not be verified.',
    });
  }

  private deleteFailed() {
    return new BadGatewayException({
      code: ErrorCode.MEDIA_DELETE_FAILED,
      message: 'The image could not be deleted.',
    });
  }
}
