import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type AdminOrganizer = components['schemas']['AdminOrganizerDto'];
export type AdminOrganizerList = components['schemas']['AdminOrganizerListDto'];
export type AdminOrganizerStatus = AdminOrganizer['status'];
export type UpdateAdminOrganizerStatus =
  components['schemas']['UpdateOrganizerStatusDto']['status'];
export type AdminEvent = components['schemas']['AdminEventDto'];
export type AdminEventList = components['schemas']['AdminEventListDto'];
export type AdminEventStatus = AdminEvent['status'];
export type AdminEventDetail = components['schemas']['AdminEventDetailDto'];
export type AdminEventTicketType =
  components['schemas']['AdminEventTicketTypeDto'];

export type ListAdminOrganizersQuery = {
  status?: AdminOrganizerStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type ListAdminEventsQuery = {
  status?: AdminEventStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export const adminKeys = {
  all: ['admin'] as const,
  organizers: () => [...adminKeys.all, 'organizers'] as const,
  organizerList: (query: ListAdminOrganizersQuery) =>
    [...adminKeys.organizers(), query] as const,
  events: () => [...adminKeys.all, 'events'] as const,
  eventList: (query: ListAdminEventsQuery) =>
    [...adminKeys.events(), query] as const,
  eventDetail: (id: string) => [...adminKeys.events(), 'detail', id] as const,
};

export function listAdminOrganizers(
  query: ListAdminOrganizersQuery = {},
): Promise<AdminOrganizerList> {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const search = params.toString();
  return apiFetch<AdminOrganizerList>(
    `/admin/organizers${search ? `?${search}` : ''}`,
  );
}

export function updateAdminOrganizerStatus(
  id: string,
  status: UpdateAdminOrganizerStatus,
): Promise<AdminOrganizer> {
  return apiFetch<AdminOrganizer>(
    `/admin/organizers/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export function listAdminEvents(
  query: ListAdminEventsQuery = {},
): Promise<AdminEventList> {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const search = params.toString();
  return apiFetch<AdminEventList>(
    `/admin/events${search ? `?${search}` : ''}`,
  );
}

export function getAdminEvent(id: string): Promise<AdminEventDetail> {
  return apiFetch<AdminEventDetail>(
    `/admin/events/${encodeURIComponent(id)}`,
  );
}

export function updateAdminEventFeatured(
  id: string,
  featured: boolean,
): Promise<AdminEvent> {
  return apiFetch<AdminEvent>(
    `/admin/events/${encodeURIComponent(id)}/featured`,
    {
      method: 'PATCH',
      body: JSON.stringify({ featured }),
    },
  );
}

export function approveAdminEvent(id: string): Promise<AdminEvent> {
  return apiFetch<AdminEvent>(
    `/admin/events/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
  );
}
