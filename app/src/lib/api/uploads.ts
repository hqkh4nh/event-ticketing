import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import type { components } from '@/lib/api/schema';

import { ApiError, apiFetch } from './client';

export type UploadTarget = components['schemas']['UploadRequestDto']['target'];
type UploadRequest = components['schemas']['UploadRequestDto'];
type CompleteUploadRequest =
  components['schemas']['CompleteUploadRequestDto'];
type UploadSignature = components['schemas']['UploadSignatureDto'];
type CompleteUpload = components['schemas']['CompleteUploadDto'];

type CloudinaryUploadResponse = {
  asset_id?: unknown;
  version?: unknown;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validateImageAsset(asset: ImagePickerAsset): void {
  if (asset.fileSize !== undefined && asset.fileSize > MAX_IMAGE_BYTES) {
    throw new ApiError(400, 'MEDIA_FILE_TOO_LARGE', 'Image exceeds 5 MB.');
  }
  if (asset.mimeType && !ALLOWED_MIME_TYPES.has(asset.mimeType)) {
    throw new ApiError(
      400,
      'MEDIA_FORMAT_UNSUPPORTED',
      'Image format is not supported.',
    );
  }
}

export async function uploadImage(
  asset: ImagePickerAsset,
  target: UploadTarget,
  eventId?: string,
): Promise<string> {
  validateImageAsset(asset);
  const request: UploadRequest = {
    target,
    ...(eventId ? { eventId } : {}),
  };
  const signed = await apiFetch<UploadSignature>('/uploads/signature', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  const form = new FormData();
  if (Platform.OS === 'web' && asset.file) {
    form.append('file', asset.file);
  } else {
    form.append(
      'file',
      {
        uri: asset.uri,
        name: asset.fileName ?? `eticket-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob,
    );
  }
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  form.append('public_id', signed.publicId);
  form.append('upload_preset', signed.uploadPreset);
  form.append('overwrite', String(signed.overwrite));
  form.append('invalidate', String(signed.invalidate));
  form.append('allowed_formats', signed.allowedFormats.join(','));

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(signed.uploadUrl, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Unable to upload the image.');
  }

  if (!uploadResponse.ok) {
    throw new ApiError(
      uploadResponse.status,
      'MEDIA_UPLOAD_FAILED',
      'Unable to upload the image.',
    );
  }

  let uploaded: CloudinaryUploadResponse;
  try {
    uploaded = (await uploadResponse.json()) as CloudinaryUploadResponse;
  } catch {
    throw new ApiError(
      uploadResponse.status,
      'MEDIA_UPLOAD_FAILED',
      'Cloudinary returned an invalid response.',
    );
  }
  if (
    typeof uploaded.asset_id !== 'string' ||
    typeof uploaded.version !== 'number'
  ) {
    throw new ApiError(
      uploadResponse.status,
      'MEDIA_UPLOAD_FAILED',
      'Cloudinary returned an invalid response.',
    );
  }

  const completeRequest: CompleteUploadRequest = {
    ...request,
    assetId: uploaded.asset_id,
    version: uploaded.version,
  };
  const completed = await apiFetch<CompleteUpload>('/uploads/complete', {
    method: 'POST',
    body: JSON.stringify(completeRequest),
  });
  return completed.secureUrl;
}

export function deleteImage(
  target: UploadTarget,
  eventId?: string,
): Promise<void> {
  const request: UploadRequest = {
    target,
    ...(eventId ? { eventId } : {}),
  };
  return apiFetch<void>('/uploads', {
    method: 'DELETE',
    body: JSON.stringify(request),
  });
}
