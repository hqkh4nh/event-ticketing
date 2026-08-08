import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AdminPaymentReviewCard } from '@/components/admin/admin-payment-review-card';
import { Button } from '@/components/ui/button';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { TextField } from '@/components/ui/text-field';
import { toUserMessage } from '@/lib/api/error-message';
import {
  listPaymentReviews,
  type PaymentReview,
  paymentReviewKeys,
  resolvePaymentReview,
} from '@/lib/api/payment-reviews';
import { formatDateTime, formatVndAmount } from '@/lib/format';

const PAGE_LIMIT = 100;

export default function AdminPaymentReviewScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [resolved, setResolved] = useState(false);
  const [pending, setPending] = useState<PaymentReview | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({ resolved, page: 1, limit: PAGE_LIMIT }),
    [resolved],
  );

  const reviewsQuery = useQuery({
    queryKey: paymentReviewKeys.list(queryParams),
    queryFn: () => listPaymentReviews(queryParams),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      resolvePaymentReview(id, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentReviewKeys.all });
      setPending(null);
      setNote('');
      setError(null);
    },
    onError: (mutationError) => {
      setPending(null);
      setNote('');
      setError(toUserMessage(mutationError, t));
    },
  });

  const currency = (amount: number) =>
    t('event.price', { price: formatVndAmount(amount, i18n.language) });
  const items = reviewsQuery.data?.items ?? [];

  return (
    <DetailScreenShell
      title={t('admin.paymentReviews.title')}
      description={t('admin.paymentReviews.description')}
    >
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          className="flex-row items-center gap-2 rounded-lg bg-error-container px-4 py-3"
        >
          <MaterialIcons
            name="error"
            size={19}
            className="text-on-error-container"
          />
          <Text className="min-w-0 flex-1 font-medium text-label-md text-on-error-container">
            {error}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        {[false, true].map((value) => {
          const selected = value === resolved;

          return (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setResolved(value)}
              className={[
                'h-touch-target-min flex-1 items-center justify-center rounded-full border px-4',
                selected
                  ? 'border-primary bg-primary'
                  : 'border-outline-variant bg-surface-container-lowest',
              ].join(' ')}
            >
              <Text
                className={`font-semibold text-label-md ${
                  selected ? 'text-on-primary' : 'text-on-surface'
                }`}
              >
                {value
                  ? t('admin.paymentReviews.filterResolved')
                  : t('admin.paymentReviews.filterOpen')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {reviewsQuery.isPending ? (
        <View className="items-center py-16">
          <ActivityIndicator className="text-primary" />
        </View>
      ) : reviewsQuery.isError ? (
        <EmptyState
          icon="cloud-off"
          title={t('admin.paymentReviews.loadErrorTitle')}
          description={toUserMessage(reviewsQuery.error, t)}
          action={
            <Button
              label={t('common.retry')}
              onPress={() => void reviewsQuery.refetch()}
            />
          }
        />
      ) : items.length ? (
        <View className="gap-3">
          {items.map((review) => (
            <AdminPaymentReviewCard
              key={review.id}
              review={review}
              busy={
                resolveMutation.isPending &&
                resolveMutation.variables?.id === review.id
              }
              statusLabel={t(`admin.paymentReviews.status.${review.status}`)}
              amountLabel={currency(review.amountVnd)}
              receivedLabel={t('admin.paymentReviews.received', {
                at: formatDateTime(review.receivedAt, i18n.language),
              })}
              orderLabel={
                review.order
                  ? t('admin.paymentReviews.orderContext', {
                      event: review.order.eventTitle,
                      status: t(
                        `admin.paymentReviews.orderStatus.${review.order.status}`,
                      ),
                    })
                  : t('admin.paymentReviews.noOrder')
              }
              buyerLabel={
                review.order
                  ? [review.order.buyerName, review.order.buyerEmail]
                      .filter(Boolean)
                      .join(' • ')
                  : undefined
              }
              reasonLabel={review.reviewReason ?? undefined}
              resolvedLabel={
                review.reviewedAt
                  ? t('admin.paymentReviews.resolvedBy', {
                      name:
                        review.reviewedByName ??
                        t('admin.paymentReviews.unknownReviewer'),
                      at: formatDateTime(review.reviewedAt, i18n.language),
                    })
                  : undefined
              }
              noteLabel={review.adminNote ?? undefined}
              resolveLabel={t('admin.actions.resolvePayment')}
              onResolve={() => {
                setError(null);
                setPending(review);
              }}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="task-alt"
          title={
            resolved
              ? t('admin.paymentReviews.emptyResolvedTitle')
              : t('admin.paymentReviews.emptyOpenTitle')
          }
          description={
            resolved
              ? t('admin.paymentReviews.emptyResolvedDescription')
              : t('admin.paymentReviews.emptyOpenDescription')
          }
        />
      )}

      <PromptDialog
        visible={pending !== null}
        title={t('admin.paymentReviews.confirmResolveTitle')}
        description={t('admin.paymentReviews.confirmResolveDescription', {
          amount: currency(pending?.amountVnd ?? 0),
          txn: pending?.sepayTxnId ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.resolvePayment')}
        icon="task-alt"
        tone="primary"
        loading={resolveMutation.isPending}
        confirmDisabled={note.trim().length === 0}
        onCancel={() => {
          setPending(null);
          setNote('');
        }}
        onConfirm={() => {
          if (!pending) return;
          resolveMutation.mutate({ id: pending.id, value: note.trim() });
        }}
      >
        <TextField
          label={t('admin.paymentReviews.noteLabel')}
          placeholder={t('admin.paymentReviews.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
      </PromptDialog>
    </DetailScreenShell>
  );
}
