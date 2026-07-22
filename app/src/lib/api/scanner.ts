import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type ScannerEvent = components['schemas']['ScannerEventDto'];

export const scannerKeys = {
  all: ['scanner'] as const,
  events: () => [...scannerKeys.all, 'events'] as const,
};

/** Events the current scanner is assigned to check in. */
export function getScannerEvents(): Promise<ScannerEvent[]> {
  return apiFetch<ScannerEvent[]>('/scanner/events');
}
