import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type CheckinResponse = components['schemas']['CheckinResponseDto'];
export type CheckinResult = CheckinResponse['result'];

/** Scans a QR payload (`code.signature`) at the gate of the given event. */
export function postCheckin(
  eventId: string,
  qr: string,
): Promise<CheckinResponse> {
  return apiFetch<CheckinResponse>(
    `/events/${encodeURIComponent(eventId)}/checkin`,
    {
      method: 'POST',
      body: JSON.stringify({ qr }),
    },
  );
}
