import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventListItem } from '@/components/event/event-list-item';
import { FeaturedEventCard } from '@/components/event/featured-event-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  eventsKeys,
  listEvents,
  type ListEventsQuery,
} from '@/lib/api/events';
import { toUserMessage } from '@/lib/api/error-message';

const CONTAINER_PADDING = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Bleeds past the list padding so the carousel runs to the screen edge.
const FEATURED_LIST_STYLE = { marginHorizontal: -CONTAINER_PADDING } as const;
const FEATURED_CONTENT_STYLE = { gap: 16, paddingHorizontal: CONTAINER_PADDING } as const;
const LIST_CONTENT_STYLE = { paddingHorizontal: CONTAINER_PADDING, paddingVertical: 24 } as const;

function Separator() {
  return <View className="h-px bg-outline-variant" />;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const isSearching = debouncedQuery.length > 0;
  const queryParams = useMemo<ListEventsQuery>(
    () => (isSearching ? { search: debouncedQuery } : {}),
    [debouncedQuery, isSearching],
  );

  const eventsQuery = useQuery({
    queryKey: eventsKeys.list(queryParams),
    queryFn: () => listEvents(queryParams),
  });

  const events = eventsQuery.data ?? [];
  const featured = events.filter((event) => event.featured);

  const listHeader =
    eventsQuery.isPending || (eventsQuery.isError && events.length === 0) ? null : (
      <View className="gap-4">
        {isSearching || featured.length === 0 ? null : (
          <>
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('home.featured')}
            </Text>

            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FeaturedEventCard event={item} />}
              showsHorizontalScrollIndicator={false}
              style={FEATURED_LIST_STYLE}
              contentContainerStyle={FEATURED_CONTENT_STYLE}
            />
          </>
        )}

        <Text className="font-semibold text-headline-md text-on-surface">
          {isSearching ? t('home.results') : t('home.upcoming')}
        </Text>
      </View>
    );

  const listEmpty = eventsQuery.isPending ? (
    <View className="items-center py-16">
      <ActivityIndicator className="text-primary" />
    </View>
  ) : eventsQuery.isError ? (
    <EmptyState
      icon="cloud-off"
      title={t('home.loadErrorTitle')}
      description={toUserMessage(eventsQuery.error, t)}
      action={
        <Button label={t('common.retry')} onPress={() => void eventsQuery.refetch()} />
      }
    />
  ) : (
    <EmptyState
      icon={isSearching ? 'search-off' : 'event-busy'}
      title={t('home.emptyTitle')}
      description={
        isSearching
          ? t('home.noResults', { query: debouncedQuery })
          : t('home.emptyDescription')
      }
    />
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      {/* Past the reading width the rows would stretch a 72px thumbnail across
          a desktop window with the title marooned at the far end. */}
      <View className="w-full max-w-content flex-1 self-center">
        <View className="gap-3 border-b border-outline-variant px-container-padding pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-display-sm text-primary">{t('auth.brand')}</Text>

            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
              <MaterialIcons name="person" size={20} className="text-primary" />
            </View>
          </View>

          <View className="h-touch-target-min flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4">
            <MaterialIcons name="search" size={20} className="text-on-surface-variant" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('home.searchPlaceholder')}
              placeholderClassName="text-on-surface-variant"
              accessibilityLabel={t('home.searchPlaceholder')}
              returnKeyType="search"
              className="h-full flex-1 font-sans text-body-md text-on-surface"
            />
          </View>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventListItem event={item} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          refreshing={eventsQuery.isRefetching}
          onRefresh={() => void eventsQuery.refetch()}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={LIST_CONTENT_STYLE}
        />
      </View>
    </SafeAreaView>
  );
}
