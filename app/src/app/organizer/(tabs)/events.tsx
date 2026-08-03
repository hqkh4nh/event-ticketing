import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrganizerEventCard } from '@/components/organizer/organizer-event-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useTokens } from '@/hooks/use-tokens';
import {
  listMyEvents,
  type OrganizerEventSummary,
} from '@/lib/api/events-organizer';
import { toUserMessage } from '@/lib/api/error-message';

type EventStatus = OrganizerEventSummary['status'];
type EventFilter = 'ALL' | Exclude<EventStatus, 'HIDDEN'>;

const FILTERS: EventFilter[] = [
  'ALL',
  'PENDING_REVIEW',
  'PUBLISHED',
  'DRAFT',
  'CANCELLED',
];
const EMPTY_EVENTS: OrganizerEventSummary[] = [];
const LIST_CONTENT_STYLE = {
  paddingHorizontal: 20,
  paddingBottom: 32,
} as const;
const GRID_CONTENT_STYLE = {
  paddingHorizontal: 20,
  paddingBottom: 32,
  gap: 12,
} as const;
const GRID_COLUMN_STYLE = { gap: 12 } as const;
const GRID_CELL_STYLE = { flex: 1 } as const;

function normalizeEventTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .trim();
}

export default function OrganizerEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const tokens = useTokens();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const columns = isWide ? 2 : 1;
  const isGrid = columns > 1;
  const [filter, setFilter] = useState<EventFilter>('ALL');
  const [query, setQuery] = useState('');

  const eventsQuery = useQuery({
    queryKey: ['organizer', 'events'],
    queryFn: listMyEvents,
  });

  const events = eventsQuery.data ?? EMPTY_EVENTS;
  const visibleEvents = useMemo(() => {
    const normalizedQuery = normalizeEventTitle(query);

    return events.filter((event) => {
      const matchesStatus = filter === 'ALL' || event.status === filter;
      const matchesTitle =
        !normalizedQuery ||
        normalizeEventTitle(event.title).includes(normalizedQuery);

      return matchesStatus && matchesTitle;
    });
  }, [events, filter, query]);
  const hasQuery = query.trim().length > 0;

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
          <View className="h-touch-target-min flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4">
            <MaterialIcons
              name="search"
              size={20}
              className="text-on-surface-variant"
            />
            <TextInput
              accessibilityLabel={t('organizer.dashboard.searchPlaceholder')}
              className="h-full min-w-0 flex-1 py-0 font-sans text-body-md text-on-surface"
              onChangeText={setQuery}
              placeholder={t('organizer.dashboard.searchPlaceholder')}
              placeholderTextColor={tokens['on-surface-variant']}
              returnKeyType="search"
              textAlignVertical="center"
              value={query}
            />
            {hasQuery ? (
              <Pressable
                accessibilityLabel={t('organizer.dashboard.clearSearch')}
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-container-high"
                onPress={() => setQuery('')}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  className="text-on-surface-variant"
                />
              </Pressable>
            ) : null}
          </View>
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
  ) : hasQuery ? (
    <EmptyState
      icon="search-off"
      title={t('organizer.dashboard.searchEmptyTitle')}
      description={t('organizer.dashboard.searchEmptyDescription', {
        query: query.trim(),
      })}
      action={
        <Button
          variant="outline"
          label={t('organizer.dashboard.clearSearch')}
          onPress={() => setQuery('')}
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
      <View className={`w-full flex-1 self-center ${isWide ? 'max-w-wide' : 'max-w-content'}`}>
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
          key={columns}
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={isGrid ? GRID_COLUMN_STYLE : undefined}
          renderItem={({ item }) =>
            isGrid ? (
              <View style={GRID_CELL_STYLE}>
                <OrganizerEventCard event={item} />
              </View>
            ) : (
              <OrganizerEventCard event={item} />
            )
          }
          ItemSeparatorComponent={isGrid ? undefined : () => <View className="h-3" />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshing={eventsQuery.isRefetching && !eventsQuery.isPending}
          onRefresh={() => void eventsQuery.refetch()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={isGrid ? GRID_CONTENT_STYLE : LIST_CONTENT_STYLE}
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
