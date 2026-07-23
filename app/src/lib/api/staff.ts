import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type StaffDevice = components['schemas']['StaffDeviceDto'];
export type CreateStaffResponse =
  components['schemas']['CreateStaffResponseDto'];
export type ReconnectResponse = components['schemas']['ReconnectResponseDto'];

export const staffKeys = {
  all: ['staff'] as const,
  byEvent: (eventId: string) => [...staffKeys.all, 'event', eventId] as const,
};

/** Scanner devices assigned to one of my events. */
export function getEventStaff(eventId: string): Promise<StaffDevice[]> {
  return apiFetch<StaffDevice[]>(`/organizer/events/${eventId}/staff`);
}

/** Creates a device on my event; the connect code is returned exactly once. */
export function createEventStaff(
  eventId: string,
  body: { label: string },
): Promise<CreateStaffResponse> {
  return apiFetch<CreateStaffResponse>(`/organizer/events/${eventId}/staff`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Issues a fresh connect code; any unredeemed code for the device dies. */
export function reconnectStaff(staffId: string): Promise<ReconnectResponse> {
  return apiFetch<ReconnectResponse>(`/organizer/staff/${staffId}/reconnect`, {
    method: 'POST',
  });
}

/** Blocks/unblocks a device or renames its label. */
export function updateStaff(
  staffId: string,
  body: { status?: 'ACTIVE' | 'BLOCKED'; label?: string },
): Promise<StaffDevice> {
  return apiFetch<StaffDevice>(`/organizer/staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
