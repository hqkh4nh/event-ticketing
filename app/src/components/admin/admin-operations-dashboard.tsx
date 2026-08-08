import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';

import {
  SalesTrendChart,
  TopEventsSection,
} from '@/components/statistics/sales-statistics-dashboard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatVndAmount } from '@/lib/format';
import type { SalesStatistics } from '@/lib/api/statistics';

type IconName = keyof typeof MaterialIcons.glyphMap;
export type AdminQueueState =
  | { status: 'pending' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'success'; count: number };

export function AdminActionQueues({
  organizerQueue,
  eventQueue,
  onOpenOrganizers,
  onOpenEvents,
}: {
  organizerQueue: AdminQueueState;
  eventQueue: AdminQueueState;
  onOpenOrganizers: () => void;
  onOpenEvents: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const queueWidth = width >= 620 ? '48.5%' : '100%';

  return (
    <View className="gap-3">
      <SectionHeading
        title={t('admin.overview.needsActionTitle')}
        description={t('admin.overview.needsActionDescription')}
      />
      <View className="flex-row flex-wrap justify-between gap-y-3">
        <QueueCard
          icon="person-add-alt-1"
          title={t('admin.overview.pendingOrganizerQueueTitle')}
          description={t('admin.overview.pendingOrganizerQueueDescription')}
          state={organizerQueue}
          style={{ width: queueWidth }}
          onOpen={onOpenOrganizers}
        />
        <QueueCard
          icon="pending-actions"
          title={t('admin.overview.pendingEventQueueTitle')}
          description={t('admin.overview.pendingEventQueueDescription')}
          state={eventQueue}
          style={{ width: queueWidth }}
          onOpen={onOpenEvents}
        />
      </View>
    </View>
  );
}

export function AdminPlatformOverview({
  statistics,
  isPending,
  errorMessage,
  onRetry,
  onExportReport,
}: {
  statistics?: SalesStatistics;
  isPending: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onExportReport: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const snapshotWidth = width >= 760 ? '23.5%' : '48.5%';
  const number = (value: number) => formatVndAmount(value, i18n.language);
  const currency = (value: number) =>
    t('event.price', { price: formatVndAmount(value, i18n.language) });

  return (
    <View className="gap-3">
      <SectionHeading
        title={t('admin.overview.platformTitle')}
        description={t('admin.overview.platformDescription')}
      />

      {isPending ? (
        <View className="items-center rounded-xl border border-outline-variant bg-surface-container-lowest py-16">
          <ActivityIndicator className="text-primary" />
        </View>
      ) : errorMessage ? (
        <View className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          <EmptyState
            icon="query-stats"
            title={t('statistics.loadErrorTitle')}
            description={errorMessage}
            action={
              <Button
                icon="refresh"
                label={t('common.retry')}
                onPress={onRetry}
              />
            }
          />
        </View>
      ) : statistics ? (
        <View className="gap-8">
          <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <View className="flex-row items-center gap-3 border-b border-outline-variant bg-primary-container px-4 py-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <MaterialIcons
                  name="analytics"
                  size={21}
                  className="text-on-primary"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-body-md text-on-primary-container">
                  {t('admin.overview.platformPulse')}
                </Text>
                <Text className="font-sans text-label-sm text-on-primary-container">
                  {t('admin.overview.platformPulseDescription')}
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-2 p-3">
              <SnapshotMetric
                icon="account-balance-wallet"
                label={t('statistics.metrics.revenue')}
                value={currency(statistics.summary.paidRevenueVnd)}
                style={{ width: snapshotWidth }}
              />
              <SnapshotMetric
                icon="confirmation-number"
                label={t('admin.overview.ticketsIssued')}
                value={number(statistics.summary.ticketsSold)}
                style={{ width: snapshotWidth }}
              />
              <SnapshotMetric
                icon="receipt-long"
                label={t('statistics.metrics.orders')}
                value={number(statistics.summary.paidOrders)}
                style={{ width: snapshotWidth }}
              />
              <SnapshotMetric
                icon="event-available"
                label={t('statistics.metrics.events')}
                value={number(statistics.summary.publishedEvents)}
                style={{ width: snapshotWidth }}
              />
            </View>
          </View>

          {statistics.summary.paidOrders > 0 ? (
            <>
              <SalesTrendChart
                daily={statistics.daily}
                onExportReport={onExportReport}
              />
              <TopEventsSection
                events={statistics.topEvents}
                currency={currency}
              />
            </>
          ) : (
            <View className="rounded-xl border border-outline-variant bg-surface-container-lowest">
              <EmptyState
                icon="query-stats"
                title={t('statistics.noSalesTitle')}
                description={t('statistics.noSalesDescription')}
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function QueueCard({
  icon,
  title,
  description,
  state,
  style,
  onOpen,
}: {
  icon: IconName;
  title: string;
  description: string;
  state: AdminQueueState;
  style?: ViewProps['style'];
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const count = state.status === 'success' ? state.count : undefined;
  const surface =
    state.status === 'error'
      ? 'border-error/40 bg-error-container'
      : state.status === 'pending'
        ? 'border-outline-variant bg-surface-container-lowest'
        : state.count > 0
          ? 'border-warning/50 bg-warning-container'
          : 'border-success/40 bg-success-container';
  const text =
    state.status === 'error'
      ? 'text-on-error-container'
      : state.status === 'pending'
        ? 'text-on-surface'
        : state.count > 0
          ? 'text-on-warning-container'
          : 'text-on-success-container';
  const statusDescription =
    state.status === 'pending'
      ? t('admin.overview.queueLoading')
      : state.status === 'error'
        ? t('admin.overview.queueLoadError')
        : state.count === 0
          ? t('admin.overview.queueClear')
          : description;
  const accessibilityStatus =
    state.status === 'success' ? String(state.count) : statusDescription;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${accessibilityStatus}`}
      accessibilityState={{ busy: state.status === 'pending' }}
      onPress={state.status === 'error' ? state.onRetry : onOpen}
      className={`min-h-36 justify-between gap-4 rounded-xl border p-4 active:opacity-80 ${surface}`}
      style={style}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-surface-container-lowest">
          <MaterialIcons
            name={state.status === 'error' ? 'cloud-off' : icon}
            size={23}
            className={text}
          />
        </View>
        {state.status === 'pending' ? (
          <ActivityIndicator className={text} />
        ) : (
          <Text className={`font-bold text-display-sm ${text}`}>
            {count ?? '!'}
          </Text>
        )}
      </View>
      <View className="gap-1">
        <Text className={`font-semibold text-body-md ${text}`}>{title}</Text>
        <Text className={`font-sans text-label-sm ${text}`}>
          {statusDescription}
        </Text>
        <View className="mt-1 min-h-11 flex-row items-center gap-1 self-start">
          <Text className={`font-semibold text-label-md ${text}`}>
            {state.status === 'error'
              ? t('common.retry')
              : t('admin.overview.reviewNow')}
          </Text>
          <MaterialIcons
            name={state.status === 'error' ? 'refresh' : 'arrow-forward'}
            size={17}
            className={text}
          />
        </View>
      </View>
    </Pressable>
  );
}

function SnapshotMetric({
  icon,
  label,
  value,
  style,
}: {
  icon: IconName;
  label: string;
  value: string;
  style?: ViewProps['style'];
}) {
  return (
    <View
      className="min-h-28 gap-3 rounded-lg bg-surface-container p-3"
      style={style}
    >
      <MaterialIcons name={icon} size={20} className="text-primary" />
      <View className="gap-0.5">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className="font-bold text-headline-md text-on-surface"
        >
          {value}
        </Text>
        <Text className="font-sans text-label-sm text-on-surface-variant">
          {label}
        </Text>
      </View>
    </View>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="gap-0.5">
      <Text className="font-semibold text-headline-md text-on-surface">
        {title}
      </Text>
      <Text className="font-sans text-label-sm text-on-surface-variant">
        {description}
      </Text>
    </View>
  );
}
