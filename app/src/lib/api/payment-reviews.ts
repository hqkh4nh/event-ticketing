import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';

export type PaymentReview = components['schemas']['PaymentReviewDto'];
export type PaymentReviewList = components['schemas']['PaymentReviewListDto'];
export type PaymentReviewStatus = PaymentReview['status'];

export type ListPaymentReviewsQuery = {
  status?: PaymentReviewStatus;
  resolved?: boolean;
  page?: number;
  limit?: number;
};

export const paymentReviewKeys = {
  all: ['payment-reviews'] as const,
  list: (query: ListPaymentReviewsQuery) =>
    [...paymentReviewKeys.all, query] as const,
};

export function listPaymentReviews(
  query: ListPaymentReviewsQuery = {},
): Promise<PaymentReviewList> {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.resolved !== undefined) {
    params.set('resolved', String(query.resolved));
  }
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const search = params.toString();
  return apiFetch<PaymentReviewList>(
    `/admin/payments/review${search ? `?${search}` : ''}`,
  );
}

export function resolvePaymentReview(
  id: string,
  note: string,
): Promise<PaymentReview> {
  return apiFetch<PaymentReview>(
    `/admin/payments/${encodeURIComponent(id)}/resolve`,
    { method: 'POST', body: JSON.stringify({ note }) },
  );
}
