import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type Withdrawal = components['schemas']['WithdrawalDto'];
export type WithdrawalList = components['schemas']['WithdrawalListDto'];
export type WithdrawalStatus = Withdrawal['status'];
export type WithdrawalBalance = components['schemas']['WithdrawalBalanceDto'];
export type CreateWithdrawal = components['schemas']['CreateWithdrawalDto'];

export type ListWithdrawalsQuery = {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
};

export type ListAdminWithdrawalsQuery = ListWithdrawalsQuery & {
  search?: string;
};

export const withdrawalKeys = {
  all: ['withdrawals'] as const,
  balance: () => [...withdrawalKeys.all, 'balance'] as const,
  organizer: () => [...withdrawalKeys.all, 'organizer'] as const,
  organizerList: (query: ListWithdrawalsQuery) =>
    [...withdrawalKeys.organizer(), query] as const,
  admin: () => [...withdrawalKeys.all, 'admin'] as const,
  adminList: (query: ListAdminWithdrawalsQuery) =>
    [...withdrawalKeys.admin(), query] as const,
};

function buildSearch(query: ListAdminWithdrawalsQuery): string {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function getWithdrawalBalance(): Promise<WithdrawalBalance> {
  return apiFetch<WithdrawalBalance>('/organizer/withdrawals/balance');
}

export function listWithdrawals(
  query: ListWithdrawalsQuery = {},
): Promise<WithdrawalList> {
  return apiFetch<WithdrawalList>(`/organizer/withdrawals${buildSearch(query)}`);
}

export function createWithdrawal(body: CreateWithdrawal): Promise<Withdrawal> {
  return apiFetch<Withdrawal>('/organizer/withdrawals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function cancelWithdrawal(id: string): Promise<Withdrawal> {
  return apiFetch<Withdrawal>(
    `/organizer/withdrawals/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  );
}

export function listAdminWithdrawals(
  query: ListAdminWithdrawalsQuery = {},
): Promise<WithdrawalList> {
  return apiFetch<WithdrawalList>(`/admin/withdrawals${buildSearch(query)}`);
}

export function approveAdminWithdrawal(id: string): Promise<Withdrawal> {
  return apiFetch<Withdrawal>(
    `/admin/withdrawals/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
  );
}

export function rejectAdminWithdrawal(
  id: string,
  reason: string,
): Promise<Withdrawal> {
  return apiFetch<Withdrawal>(
    `/admin/withdrawals/${encodeURIComponent(id)}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export function markAdminWithdrawalPaid(
  id: string,
  body: { transferReference?: string; adminNote?: string },
): Promise<Withdrawal> {
  return apiFetch<Withdrawal>(
    `/admin/withdrawals/${encodeURIComponent(id)}/mark-paid`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
