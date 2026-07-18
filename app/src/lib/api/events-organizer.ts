import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type OrganizerEvent = components['schemas']['OrganizerEventDto'];
export type OrganizerEventSummary =
  components['schemas']['OrganizerEventSummaryDto'];
export type OrganizerTicketType =
  components['schemas']['OrganizerTicketTypeDto'];
export type CreateEventBody = components['schemas']['CreateEventDto'];
export type UpdateEventBody = components['schemas']['UpdateEventDto'];
export type CreateTicketTypeBody =
  components['schemas']['CreateTicketTypeDto'];
export type UpdateTicketTypeBody =
  components['schemas']['UpdateTicketTypeDto'];

const base = '/organizer/events';

export function listMyEvents(): Promise<OrganizerEventSummary[]> {
  return apiFetch<OrganizerEventSummary[]>(base);
}

export function getMyEvent(id: string): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${id}`);
}

export function createEvent(body: CreateEventBody): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(base, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEvent(
  id: string,
  body: UpdateEventBody,
): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteEvent(id: string): Promise<void> {
  return apiFetch<void>(`${base}/${id}`, { method: 'DELETE' });
}

export function publishEvent(id: string): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${id}/publish`, { method: 'POST' });
}

export function unpublishEvent(id: string): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${id}/unpublish`, {
    method: 'POST',
  });
}

export function cancelEvent(id: string): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${id}/cancel`, { method: 'POST' });
}

export function addTicketType(
  eventId: string,
  body: CreateTicketTypeBody,
): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(`${base}/${eventId}/ticket-types`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTicketType(
  eventId: string,
  ticketTypeId: string,
  body: UpdateTicketTypeBody,
): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(
    `${base}/${eventId}/ticket-types/${ticketTypeId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteTicketType(
  eventId: string,
  ticketTypeId: string,
): Promise<OrganizerEvent> {
  return apiFetch<OrganizerEvent>(
    `${base}/${eventId}/ticket-types/${ticketTypeId}`,
    { method: 'DELETE' },
  );
}
