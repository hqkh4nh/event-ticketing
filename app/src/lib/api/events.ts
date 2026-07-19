import type { components, operations } from '@/lib/api/schema';

import { apiFetch } from './client';

export type EventSummary = components['schemas']['EventSummaryDto'];
export type EventDetail = components['schemas']['EventDetailDto'];
export type TicketTypeSummary = components['schemas']['TicketTypeDto'];
export type ListEventsQuery = NonNullable<
  operations['EventsController_findAll']['parameters']['query']
>;

const base = '/events';

export const eventsKeys = {
  all: ['events'] as const,
  list: (query: ListEventsQuery = {}) => [...eventsKeys.all, 'list', query] as const,
  detail: (id: string) => [...eventsKeys.all, 'detail', id] as const,
};

function toQueryString(query: ListEventsQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.city) params.set('city', query.city);
  if (query.category) params.set('category', query.category);
  if (query.featured !== undefined) {
    params.set('featured', String(query.featured));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function listEvents(query: ListEventsQuery = {}): Promise<EventSummary[]> {
  return apiFetch<EventSummary[]>(`${base}${toQueryString(query)}`);
}

export function getEvent(id: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`${base}/${encodeURIComponent(id)}`);
}
