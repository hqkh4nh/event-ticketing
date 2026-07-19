import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrganizerEventCard } from '@/components/organizer/organizer-event-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listMyEvents,
  type OrganizerEventSummary,
} from '@/lib/api/events-organizer';
import { toUserMessage } from '@/lib/api/error-message';

type EventStatus = OrganizerEventSummary['status'];
type EventFilter = 'ALL' | Exclude<EventStatus, 'HIDDEN'>;

const FILTERS: EventFilter[] = ['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'];
const EMPTY_EVENTS: OrganizerEventSummary[] = [];
const LIST_CONTENT_STYLE = {
  paddingHorizontal: 20,
  paddingBottom: 32,
} as const;

export default function OrganizerEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<EventFilter>('ALL');

  const eventsQuery = useQuery({
    queryKey: ['organizer', 'events'],
    queryFn: listMyEvents,
  });

  const events = eventsQuery.data ?? EMPTY_EVENTS;
  const visibleEvents = useMemo(
    () =>
      filter === 'ALL'
        ? events
        : events.filter((event) => event.status === filter),
    [events, filter],
  );

  const listHeader = (
    <View className="gap-5 pb-5 pt-5">
      {eventsQuery.isRefetchError ? (
        <View className="min-h-touch-target-min flex-row items-center gap-3 rounded border border-error/30 bg-error-container px-3">
          <MaterialIcons name="cloud-off" size={20} className="text-on-error-container" />
          <Text className="flex-1 font-sans text-label-md text-on-error-container">
            {toUserMessage(eventsQuery.error, t)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            onPress={() => void eventsQuery.refetch()}
            className="h-touch-target-min w-touch-target-min items-center justify-center active:opacity-60"
          >
            <MaterialIcons name="refresh" size={22} className="text-on-error-container" />
          </Pressable>
        </View>
      ) : null}

      {events.length > 0 ? (
        <>
          <StatusFilter value={filter} onChange={setFilter} />
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.dashboard.eventList')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('organizer.dashboard.resultCount', {
                count: visibleEvents.length,
              })}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  const listEmpty = eventsQuery.isPending ? (
    <View className="items-center py-16">
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
  ) : events.length === 0 ? (
    <EmptyState
      icon="event-note"
      title={t('organizer.emptyTitle')}
      description={t('organizer.emptyDescription')}
      action={
        <Button
          icon="add"
          label={t('organizer.create')}
          onPress={() => router.push('/organizer/events/new')}
        />
      }
    />
  ) : (
    <EmptyState
      icon="filter-list-off"
      title={t('organizer.dashboard.filteredEmptyTitle')}
      description={t('organizer.dashboard.filteredEmptyDescription')}
      action={
        <Button
          variant="outline"
          label={t('organizer.dashboard.showAll')}
          onPress={() => setFilter('ALL')}
        />
      }
    />
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="flex-row items-center justify-between gap-4 border-b border-outline-variant px-container-padding py-4">
          <Text className="flex-1 font-bold text-display-sm text-on-surface">
            {t('organizer.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('organizer.create')}
            onPress={() => router.push('/organizer/events/new')}
            className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full bg-primary active:opacity-70"
          >
            <MaterialIcons name="add" size={24} className="text-on-primary" />
          </Pressable>
        </View>

        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrganizerEventCard event={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          refreshing={eventsQuery.isRefetching && !eventsQuery.isPending}
          onRefresh={() => void eventsQuery.refetch()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_CONTENT_STYLE}
        />
      </View>
    </SafeAreaView>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: EventFilter;
  onChange: (value: EventFilter) => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="tablist"
      className="h-touch-target-min flex-row rounded-lg bg-surface-container p-1"
    >
      {FILTERS.map((filter) => {
        const selected = filter === value;
        const label = t(`organizer.dashboard.filter.${filter}`);

        return (
          <Pressable
            key={filter}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(filter)}
            className={[
              'flex-1 items-center justify-center rounded px-1 active:opacity-70',
              selected ? 'bg-surface-container-lowest' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Text
              numberOfLines={1}
              className={[
                'font-medium text-label-sm',
                selected ? 'text-primary' : 'text-on-surface-variant',
              ].join(' ')}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
