import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { AdminStatusBadge } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminKeys,
  approveAdminEvent,
  getAdminEvent,
  updateAdminEventFeatured,
} from '@/lib/api/admin';
import { toUserMessage } from '@/lib/api/error-message';
import { formatDateTime, formatVndAmount } from '@/lib/format';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <MaterialIcons name={icon} size={19} className="text-on-surface-variant" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-medium text-label-sm text-on-surface-variant">
          {label}
        </Text>
        <Text className="font-sans text-body-md text-on-surface">{value}</Text>
      </View>
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <Text className="font-bold text-numeric-lg text-on-surface">{value}</Text>
      <Text className="font-medium text-label-sm text-on-surface-variant">
        {label}
      </Text>
    </View>
  );
}

export default function AdminEventDetailScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [confirming, setConfirming] = useState<'approve' | 'feature' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const eventQuery = useQuery({
    queryKey: adminKeys.eventDetail(id),
    queryFn: () => getAdminEvent(id),
  });

  function onSettled() {
    void queryClient.invalidateQueries({ queryKey: adminKeys.events() });
    setConfirming(null);
  }

  const approvalMutation = useMutation({
    mutationFn: () => approveAdminEvent(id),
    onSuccess: onSettled,
    onError: (mutationError) => {
      setConfirming(null);
      setError(toUserMessage(mutationError, t));
    },
  });

  const featuredMutation = useMutation({
    mutationFn: (featured: boolean) => updateAdminEventFeatured(id, featured),
    onSuccess: onSettled,
    onError: (mutationError) => {
      setConfirming(null);
      setError(toUserMessage(mutationError, t));
    },
  });

  const event = eventQuery.data;
  const currency = (amount: number) =>
    t('event.price', { price: formatVndAmount(amount, i18n.language) });

  if (eventQuery.isPending) {
    return (
      <DetailScreenShell title={t('admin.eventDetail.title')}>
        <View className="items-center py-16">
          <ActivityIndicator className="text-primary" />
        </View>
      </DetailScreenShell>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <DetailScreenShell title={t('admin.eventDetail.title')}>
        <EmptyState
          icon="cloud-off"
          title={t('admin.eventDetail.loadErrorTitle')}
          description={toUserMessage(eventQuery.error, t)}
          action={
            <Button
              label={t('common.retry')}
              onPress={() => void eventQuery.refetch()}
            />
          }
        />
      </DetailScreenShell>
    );
  }

  const busy = approvalMutation.isPending || featuredMutation.isPending;

  return (
    <DetailScreenShell title={t('admin.eventDetail.title')}>
      {event.coverImageUrl ? (
        <Image
          source={event.coverImageUrl}
          contentFit="cover"
          transition={200}
          style={{ width: '100%', height: 200, borderRadius: 12 }}
        />
      ) : (
        <View className="h-[200px] items-center justify-center rounded-xl bg-surface-container-low">
          <MaterialIcons
            name="image-not-supported"
            size={40}
            className="text-outline"
          />
        </View>
      )}

      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <AdminStatusBadge
            status={event.status}
            label={t(`admin.eventStatus.${event.status}`)}
          />
          {event.featured ? (
            <View className="flex-row items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1">
              <MaterialIcons
                name="star"
                size={13}
                className="text-on-secondary-container"
              />
              <Text className="font-medium text-label-sm text-on-secondary-container">
                {t('admin.events.featured')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="font-bold text-display-sm text-on-surface">
          {event.title}
        </Text>
      </View>

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

      <View className="flex-row flex-wrap gap-3">
        <MetricTile
          label={t('admin.eventDetail.soldLabel')}
          value={`${event.sold}/${event.capacity}`}
        />
        <MetricTile
          label={t('admin.eventDetail.revenueLabel')}
          value={currency(event.revenueVnd)}
        />
        <MetricTile
          label={t('admin.eventDetail.checkedInLabel')}
          value={String(event.checkedInCount)}
        />
        <MetricTile
          label={t('admin.eventDetail.ticketTypeLabel')}
          value={String(event.ticketTypes.length)}
        />
      </View>

      <View className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <InfoRow
          icon="person"
          label={t('admin.eventDetail.organizer')}
          value={
            event.organizerEmail
              ? `${event.organizerName} • ${event.organizerEmail}`
              : event.organizerName
          }
        />
        <InfoRow
          icon="schedule"
          label={t('admin.eventDetail.schedule')}
          value={`${formatDateTime(event.startAt, i18n.language)} → ${formatDateTime(
            event.endAt,
            i18n.language,
          )}`}
        />
        <InfoRow
          icon="location-on"
          label={t('admin.eventDetail.venue')}
          value={`${event.venue}, ${event.city}`}
        />
        <InfoRow
          icon="category"
          label={t('admin.eventDetail.category')}
          value={t(`event.category.${event.category}`)}
        />
      </View>

      <View className="gap-2">
        <Text className="font-semibold text-headline-md text-on-surface">
          {t('admin.eventDetail.descriptionTitle')}
        </Text>
        <Text className="font-sans text-body-md leading-6 text-on-surface-variant">
          {event.description}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="font-semibold text-headline-md text-on-surface">
          {t('admin.eventDetail.ticketTypesTitle')}
        </Text>
        {event.ticketTypes.length ? (
          <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            {event.ticketTypes.map((ticketType, index) => (
              <View
                key={ticketType.id}
                className={[
                  'flex-row items-center gap-3 p-4',
                  index === event.ticketTypes.length - 1
                    ? ''
                    : 'border-b border-outline-variant',
                ].join(' ')}
              >
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="font-medium text-body-md text-on-surface">
                    {ticketType.name}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('admin.eventDetail.ticketTypeSold', {
                      sold: ticketType.soldCount,
                      total: ticketType.quantityTotal,
                    })}
                  </Text>
                </View>
                <Text className="font-semibold text-body-md text-primary">
                  {currency(ticketType.priceVnd)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="font-sans text-body-md text-on-surface-variant">
            {t('admin.eventDetail.noTicketTypes')}
          </Text>
        )}
      </View>

      {event.status === 'PENDING_REVIEW' ? (
        <Button
          icon="verified"
          label={t('admin.actions.approveEvent')}
          loading={approvalMutation.isPending}
          disabled={busy}
          onPress={() => {
            setError(null);
            setConfirming('approve');
          }}
        />
      ) : null}

      {event.status === 'PUBLISHED' || event.featured ? (
        <Button
          variant="outline"
          icon={event.featured ? 'star-outline' : 'star'}
          label={
            event.featured
              ? t('admin.actions.unfeature')
              : t('admin.actions.feature')
          }
          loading={featuredMutation.isPending}
          disabled={busy}
          onPress={() => {
            setError(null);
            if (event.featured) {
              featuredMutation.mutate(false);
            } else {
              setConfirming('feature');
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        visible={confirming === 'approve'}
        title={t('admin.events.confirmApproveTitle')}
        description={t('admin.events.confirmApproveDescription', {
          event: event.title,
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.approveEvent')}
        icon="verified"
        tone="primary"
        loading={approvalMutation.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => approvalMutation.mutate()}
      />
      <ConfirmDialog
        visible={confirming === 'feature'}
        title={t('admin.events.confirmFeatureTitle')}
        description={t('admin.events.confirmFeatureDescription', {
          event: event.title,
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.events.confirmFeatureAction')}
        icon="star"
        tone="primary"
        loading={featuredMutation.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => featuredMutation.mutate(true)}
      />
    </DetailScreenShell>
  );
}
