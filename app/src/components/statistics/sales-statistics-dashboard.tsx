import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { formatVndAmount } from '@/lib/format';
import type {
  DailySalesStatistic,
  SalesStatistics,
  TopEventStatistic,
} from '@/lib/api/statistics';

type MetricIcon = keyof typeof MaterialIcons.glyphMap;
type ChartMetric = 'revenue' | 'tickets';

export function SalesStatisticsDashboard({
  data,
  onEventPress,
  onExportReport,
}: {
  data: SalesStatistics;
  onEventPress?: (event: TopEventStatistic) => void;
  onExportReport?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const metricWidth = width >= 900 ? '23.5%' : width >= 620 ? '48.5%' : '47.5%';
  const currency = (amount: number) =>
    t('event.price', {
      price: formatVndAmount(amount, i18n.language),
    });

  return (
    <View className="gap-7">
      <View className="gap-3">
        <SectionHeading
          title={t('statistics.summaryTitle')}
          description={t('statistics.allTime')}
        />
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <MetricCard
            icon="account-balance-wallet"
            label={t('statistics.metrics.revenue')}
            value={currency(data.summary.paidRevenueVnd)}
            tone="primary"
            style={{ width: metricWidth }}
          />
          <MetricCard
            icon="confirmation-number"
            label={t('statistics.metrics.tickets')}
            value={formatVndAmount(data.summary.ticketsSold, i18n.language)}
            tone="success"
            style={{ width: metricWidth }}
          />
          <MetricCard
            icon="receipt-long"
            label={t('statistics.metrics.orders')}
            value={formatVndAmount(data.summary.paidOrders, i18n.language)}
            tone="warning"
            style={{ width: metricWidth }}
          />
          <MetricCard
            icon="event-available"
            label={t('statistics.metrics.events')}
            value={formatVndAmount(data.summary.publishedEvents, i18n.language)}
            tone="primary"
            style={{ width: metricWidth }}
          />
        </View>
      </View>

      {data.summary.paidOrders > 0 ? (
        <>
          <SalesTrendChart daily={data.daily} onExportReport={onExportReport} />
          <TopEventsSection
            events={data.topEvents}
            currency={currency}
            onEventPress={onEventPress}
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
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  style,
}: {
  icon: MetricIcon;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning';
  style?: ViewProps['style'];
}) {
  const colors = {
    primary: ['bg-primary-container', 'text-on-primary-container'],
    success: ['bg-success-container', 'text-on-success-container'],
    warning: ['bg-warning-container', 'text-on-warning-container'],
  }[tone];

  return (
    <View
      className="min-h-36 justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      style={style}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-lg ${colors[0]}`}
      >
        <MaterialIcons name={icon} size={21} className={colors[1]} />
      </View>
      <View className="gap-1">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          className="font-bold text-numeric-lg text-on-surface"
        >
          {value}
        </Text>
        <Text className="font-medium text-label-sm text-on-surface-variant">
          {label}
        </Text>
      </View>
    </View>
  );
}

export function SalesTrendChart({
  daily,
  onExportReport,
}: {
  daily: DailySalesStatistic[];
  onExportReport?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const values = daily.map((day) =>
    metric === 'revenue' ? day.revenueVnd : day.ticketsSold,
  );
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
    [i18n.language],
  );
  const formatDate = (date: string) =>
    dateFormatter.format(new Date(`${date}T00:00:00+07:00`));
  const formattedTotal =
    metric === 'revenue'
      ? t('event.price', {
          price: formatVndAmount(total, i18n.language),
        })
      : formatVndAmount(total, i18n.language);

  return (
    <View className="gap-3">
      <SectionHeading
        title={t('statistics.trendTitle')}
        description={t('statistics.last30Days')}
      />
      <View className="gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="font-sans text-label-sm text-on-surface-variant">
              {t('statistics.periodTotal')}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="font-bold text-headline-lg text-on-surface"
            >
              {formattedTotal}
            </Text>
          </View>
          <View className="flex-row rounded-full bg-surface-container p-1">
            <ChartToggle
              selected={metric === 'revenue'}
              label={t('statistics.revenue')}
              onPress={() => setMetric('revenue')}
            />
            <ChartToggle
              selected={metric === 'tickets'}
              label={t('statistics.tickets')}
              onPress={() => setMetric('tickets')}
            />
          </View>
        </View>

        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${t('statistics.trendTitle')}: ${formattedTotal}`}
        >
          <View className="h-28 flex-row items-end gap-0.5 border-b border-outline-variant pb-1">
            {values.map((value, index) => (
              <View
                key={daily[index]?.date ?? index}
                className="flex-1 overflow-hidden rounded-t-sm bg-primary-container"
                style={{
                  height:
                    value === 0 ? 0 : `${Math.max(4, (value / max) * 100)}%`,
                }}
              >
                <View className="h-full bg-primary" />
              </View>
            ))}
          </View>
          <View className="mt-2 flex-row justify-between">
            {[daily[0], daily[Math.floor(daily.length / 2)], daily.at(-1)].map(
              (day, index) => (
                <Text
                  key={`${day?.date ?? index}-${index}`}
                  className="font-sans text-label-sm text-on-surface-variant"
                >
                  {day ? formatDate(day.date) : ''}
                </Text>
              ),
            )}
          </View>
        </View>
      </View>
      {onExportReport ? (
        <Button
          icon="file-download"
          label={t('statistics.export.action')}
          variant="outline"
          onPress={onExportReport}
        />
      ) : null}
    </View>
  );
}

function ChartToggle({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-touch-target-min justify-center rounded-full px-3 ${selected ? 'bg-primary' : ''}`}
    >
      <Text
        className={`font-semibold text-label-sm ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TopEventsSection({
  events,
  currency,
  onEventPress,
}: {
  events: TopEventStatistic[];
  currency: (amount: number) => string;
  onEventPress?: (event: TopEventStatistic) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <View className="gap-3">
      <SectionHeading
        title={t('statistics.topEventsTitle')}
        description={t('statistics.topEventsDescription')}
      />
      {events.length ? (
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {events.map((event, index) => {
            const content = (
              <>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
                  <Text className="font-bold text-label-lg text-on-primary-container">
                    {index + 1}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text
                    numberOfLines={1}
                    className="font-semibold text-body-md text-on-surface"
                  >
                    {event.title}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('statistics.eventMeta', {
                      tickets: formatVndAmount(
                        event.ticketsSold,
                        i18n.language,
                      ),
                      orders: formatVndAmount(event.paidOrders, i18n.language),
                    })}
                  </Text>
                </View>
                <View className="max-w-32 items-end gap-1">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="font-bold text-body-md text-primary"
                  >
                    {currency(event.revenueVnd)}
                  </Text>
                  {onEventPress ? (
                    <MaterialIcons
                      name="chevron-right"
                      size={18}
                      className="text-on-surface-variant"
                    />
                  ) : null}
                </View>
              </>
            );

            const rowClass = `min-h-20 flex-row items-center gap-3 p-4 ${index ? 'border-t border-outline-variant' : ''}`;
            return onEventPress ? (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                onPress={() => onEventPress(event)}
                className={`${rowClass} active:bg-surface-container-low`}
              >
                {content}
              </Pressable>
            ) : (
              <View key={event.id} className={rowClass}>
                {content}
              </View>
            );
          })}
        </View>
      ) : (
        <View className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          <EmptyState
            icon="emoji-events"
            title={t('statistics.noTopEventsTitle')}
            description={t('statistics.noTopEventsDescription')}
          />
        </View>
      )}
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
