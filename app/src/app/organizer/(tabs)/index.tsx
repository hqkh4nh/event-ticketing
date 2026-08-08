import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrganizerStatusSummary } from '@/components/organizer/organizer-status-summary';
import { RevenueReportDialog } from '@/components/statistics/revenue-report-dialog';
import { SalesStatisticsDashboard } from '@/components/statistics/sales-statistics-dashboard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listMyEvents,
  type OrganizerEventSummary,
} from '@/lib/api/events-organizer';
import { toUserMessage } from '@/lib/api/error-message';
import { getOrganizerStatistics, statisticsKeys } from '@/lib/api/statistics';

const EMPTY_EVENTS: OrganizerEventSummary[] = [];

export default function OrganizerOverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const eventsQuery = useQuery({
    queryKey: ['organizer', 'events'],
    queryFn: listMyEvents,
  });
  const statisticsQuery = useQuery({
    queryKey: statisticsKeys.organizer(),
    queryFn: getOrganizerStatistics,
  });
  const events = eventsQuery.data ?? EMPTY_EVENTS;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="border-b border-outline-variant px-container-padding py-4">
          <Text className="font-bold text-display-sm text-on-surface">
            {t('organizer.overview.title')}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-6 px-container-padding py-6"
        >
          <View className="gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.overview.eventStatus')}
            </Text>
            {eventsQuery.isPending ? (
              <View className="items-center py-12">
                <ActivityIndicator className="text-primary" />
              </View>
            ) : eventsQuery.isError ? (
              <EmptyState
                icon="cloud-off"
                title={t('organizer.dashboard.loadErrorTitle')}
                description={toUserMessage(eventsQuery.error, t)}
                action={
                  <Button
                    icon="refresh"
                    label={t('common.retry')}
                    onPress={() => void eventsQuery.refetch()}
                  />
                }
              />
            ) : (
              <OrganizerStatusSummary events={events} />
            )}
          </View>

          {statisticsQuery.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : statisticsQuery.isError ? (
            <EmptyState
              icon="query-stats"
              title={t('statistics.loadErrorTitle')}
              description={toUserMessage(statisticsQuery.error, t)}
              action={
                <Button
                  icon="refresh"
                  label={t('common.retry')}
                  onPress={() => void statisticsQuery.refetch()}
                />
              }
            />
          ) : (
            <SalesStatisticsDashboard
              data={statisticsQuery.data}
              onEventPress={(event) =>
                router.push(`/organizer/events/${event.id}`)
              }
              onExportReport={() => setReportOpen(true)}
            />
          )}
        </ScrollView>
      </View>
      <RevenueReportDialog
        scope="organizer"
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </SafeAreaView>
  );
}
