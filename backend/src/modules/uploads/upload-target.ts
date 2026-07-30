export const UploadTarget = {
  USER_AVATAR: 'USER_AVATAR',
  EVENT_COVER: 'EVENT_COVER',
} as const;

export type UploadTarget = (typeof UploadTarget)[keyof typeof UploadTarget];

export function buildUploadPublicId(
  target: UploadTarget,
  userId: string,
  eventId?: string,
) {
  if (target === UploadTarget.USER_AVATAR) {
    return `eticket/users/${userId}/avatar`;
  }

  if (!eventId) {
    throw new Error('eventId is required for an event cover upload');
  }

  return `eticket/events/${eventId}/cover`;
}
