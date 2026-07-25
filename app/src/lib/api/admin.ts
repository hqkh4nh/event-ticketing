import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type AdminOrganizer = components['schemas']['AdminOrganizerDto'];
export type AdminOrganizerList = components['schemas']['AdminOrganizerListDto'];
export type AdminOrganizerStatus = AdminOrganizer['status'];
export type UpdateAdminOrganizerStatus =
  components['schemas']['UpdateOrganizerStatusDto']['status'];

export type ListAdminOrganizersQuery = {
  status?: AdminOrganizerStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export const adminKeys = {
  all: ['admin'] as const,
  organizers: () => [...adminKeys.all, 'organizers'] as const,
  organizerList: (query: ListAdminOrganizersQuery) =>
    [...adminKeys.organizers(), query] as const,
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
