import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type OrderResponse = components['schemas']['OrderResponseDto'];
export type IssuedTicket = components['schemas']['IssuedTicketDto'];
export type MyTicket = components['schemas']['MyTicketDto'];
export type CreateOrderBody = components['schemas']['CreateOrderDto'];

export const ordersKeys = {
  all: ['orders'] as const,
  detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
};

export const ticketsKeys = {
  all: ['tickets'] as const,
  mine: () => [...ticketsKeys.all, 'mine'] as const,
};

export function createOrder(body: CreateOrderBody): Promise<OrderResponse> {
  return apiFetch<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getOrder(id: string): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/orders/${encodeURIComponent(id)}`);
}

export function getMyTickets(): Promise<MyTicket[]> {
  return apiFetch<MyTicket[]>('/me/tickets');
}
