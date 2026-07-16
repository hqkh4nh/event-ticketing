import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventListItem } from '@/components/event/event-list-item';
import { FeaturedEventCard } from '@/components/event/featured-event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { MOCK_EVENT_SUMMARIES } from '@/lib/mock/events';

const FEATURED = MOCK_EVENT_SUMMARIES.filter((event) => event.featured);

const CONTAINER_PADDING = 20;

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

  const needle = query.trim().toLowerCase();
  const isSearching = needle.length > 0;

  // Filtering the mock list stands in for the search parameters of
  // `GET /api/events` (AC-4). Swap this for a query once the endpoint exists.
  const results = useMemo(() => {
    if (!isSearching) return MOCK_EVENT_SUMMARIES;

    return MOCK_EVENT_SUMMARIES.filter(
      (event) =>
        event.title.toLowerCase().includes(needle) ||
        event.city.toLowerCase().includes(needle),
    );
  }, [isSearching, needle]);

  const listHeader = (
    <View className="gap-4">
      {isSearching ? null : (
        <>
          <Text className="font-semibold text-headline-md text-on-surface">
            {t('home.featured')}
          </Text>

          <FlatList
            horizontal
            data={FEATURED}
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
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventListItem event={item} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="search-off"
              title={t('home.emptyTitle')}
              description={t('home.noResults', { query: query.trim() })}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={LIST_CONTENT_STYLE}
        />
      </View>
    </SafeAreaView>
  );
}
