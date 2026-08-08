import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type SalesStatistics = components['schemas']['SalesStatisticsDto'];
export type DailySalesStatistic =
  components['schemas']['DailySalesStatisticDto'];
export type TopEventStatistic = components['schemas']['TopEventStatisticDto'];

export const statisticsKeys = {
  all: ['statistics'] as const,
  admin: () => [...statisticsKeys.all, 'admin'] as const,
  organizer: () => [...statisticsKeys.all, 'organizer'] as const,
};

export function getAdminStatistics(): Promise<SalesStatistics> {
  return apiFetch<SalesStatistics>('/admin/statistics');
}

export function getOrganizerStatistics(): Promise<SalesStatistics> {
  return apiFetch<SalesStatistics>('/organizer/statistics');
}
