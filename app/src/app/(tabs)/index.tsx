import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventListItem } from '@/components/event/event-list-item';
import { FeaturedEventCard } from '@/components/event/featured-event-card';
import { useTokens } from '@/hooks/use-tokens';
import { MOCK_EVENT_SUMMARIES } from '@/lib/mock/events';

const FEATURED = MOCK_EVENT_SUMMARIES.filter((event) => event.featured);

export default function HomeScreen() {
  const { t } = useTranslation();
  const tokens = useTokens();
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
          <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
            {t('home.featured')}
          </Text>

          <FlatList
            horizontal
            data={FEATURED}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FeaturedEventCard event={item} />}
            showsHorizontalScrollIndicator={false}
            // Bleeds past the list padding so cards run to the screen edge.
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}
          />
        </>
      )}

      <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
        {isSearching ? t('home.results') : t('home.upcoming')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface dark:bg-d-surface">
      <View className="gap-3 border-b border-outline-variant px-container-padding pb-3 dark:border-d-outline-variant">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-[24px] leading-8 text-primary dark:text-d-primary">
            {t('auth.brand')}
          </Text>

          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-low dark:bg-d-surface-container">
            <MaterialIcons name="person" size={20} color={tokens.primary} />
          </View>
        </View>

        <View className="flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 dark:border-d-outline-variant dark:bg-d-surface-container">
          <MaterialIcons name="search" size={20} color={tokens.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={tokens.onSurfaceVariant}
            accessibilityLabel={t('home.searchPlaceholder')}
            returnKeyType="search"
            className="h-touch-target-min flex-1 font-sans text-[16px] leading-6 text-on-surface dark:text-d-on-surface"
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventListItem event={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text className="py-8 text-center font-sans text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
            {t('home.noResults', { query: query.trim() })}
          </Text>
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingVertical: 24 }}
      />
    </SafeAreaView>
  );
}
