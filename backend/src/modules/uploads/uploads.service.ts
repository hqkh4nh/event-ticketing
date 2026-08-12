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
    /*
     * Backend không nhận file ảnh. Nó kiểm tra quyền, chọn publicId và ký chính
     * xác tập tham số được phép; app dùng signature này upload trực tiếp lên
     * Cloudinary. API secret chỉ tồn tại ở backend.
     */
    const credentials = this.getCredentials();
    const publicId = await this.resolvePublicId(user, dto);
    const timestamp = Math.floor(Date.now() / 1000);
    const overwrite = true;
    const invalidate = true;
    /*
     * Ký cả public_id/preset/format/overwrite để client không thể lấy một chữ ký
     * hợp lệ rồi đổi đích hoặc nới policy upload. timestamp cũng giới hạn tuổi
     * thực tế của signed request theo cách Cloudinary kiểm tra.
     */
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
    /*
     * `/complete` là bước xác nhận hai pha ở tầng ứng dụng: upload Cloudinary
     * thành công chưa đủ để DB tin URL. Backend tự đọc resource, so asset/version
     * và policy trước khi lưu secureUrl.
     */
    this.configureCloudinary();
    const publicId = await this.resolvePublicId(user, dto);
    const secureUrl = await this.verifyUploadedResource(dto, publicId);

    if (dto.target === UploadTarget.USER_AVATAR) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: secureUrl },
      });
    } else {
      /*
       * status DRAFT được đặt lại trong WHERE thay vì chỉ tin lần check ở
       * resolvePublicId. Nếu event vừa được submit trong lúc file đang upload,
       * update count = 0 và ảnh không được gắn vào event đang review.
       */
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
      /*
       * Với cover, ưu tiên clear DB bằng CAS trước để event không trỏ tới asset
       * bị xóa. Destroy Cloudinary là best effort; thất bại có thể để orphan file
       * nhưng không làm Event trỏ tới ảnh đã mất.
       */
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

    /*
     * Với avatar, source hiện tại destroy trước rồi mới clear DB. Nếu destroy
     * lỗi thì giữ URL và báo lỗi; nếu DB update lỗi sau destroy thì URL có thể
     * tạm trỏ tới asset mất vì Cloudinary và PostgreSQL không có chung transaction.
     */
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
    /*
     * publicId cố định có overwrite. asset_id + version liên kết `/complete`
     * với đúng phiên bản app vừa upload, tránh một response cũ xác nhận nhầm
     * phiên bản mới ở cùng publicId.
     */
    const resourceMatchesUpload =
      resource.asset_id === dto.assetId && resource.version === dto.version;
    if (!resourceMatchesUpload) {
      throw this.uploadFailed();
    }

    // Client-side validation chỉ để UX; backend xác minh lại nguồn độc lập.
    const imageIsValid =
      typeof secureUrl === 'string' &&
      typeof resource.bytes === 'number' &&
      resource.bytes <= MAX_IMAGE_BYTES &&
      typeof format === 'string' &&
      ALLOWED_IMAGE_FORMAT_SET.has(format);

    if (!imageIsValid) {
      // Resource vi phạm policy được dọn best effort trước khi trả lỗi gateway.
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
      // user.id từ JWT quyết định đích; client không thể chọn avatar của user khác.
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

    /*
     * Query đồng thời theo eventId và organizerId kiểm tra ownership mà không
     * tiết lộ event của người khác. Chỉ DRAFT được đổi cover để nội dung đang
     * duyệt/public không bị thay ảnh ngoài quy trình moderation.
     */
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
    // count khác 1 cho biết event đã đổi trạng thái giữa check và update.
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
