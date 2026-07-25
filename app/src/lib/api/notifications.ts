import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type AppNotification = components['schemas']['NotificationDto'];
export type NotificationList = components['schemas']['NotificationListDto'];

export type ListNotificationsQuery = {
  page?: number;
  limit?: number;
};

export const notificationsKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationsKeys.all, 'list'] as const,
  list: (query: ListNotificationsQuery) =>
    [...notificationsKeys.lists(), query] as const,
  unread: () => [...notificationsKeys.all, 'unread-count'] as const,
};

export function listNotifications(
  query: ListNotificationsQuery = {},
): Promise<NotificationList> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const search = params.toString();
  return apiFetch<NotificationList>(
    `/notifications${search ? `?${search}` : ''}`,
  );
}

export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  );
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>('/notifications/read-all', { method: 'POST' });
}
