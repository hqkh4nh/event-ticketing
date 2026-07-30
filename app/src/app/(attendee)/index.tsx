import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySelector } from '@/components/discovery/category-selector';
import { CityPickerSheet } from '@/components/discovery/city-picker-sheet';
import { CompactEventCard } from '@/components/discovery/compact-event-card';
import { DiscoveryHeader } from '@/components/discovery/discovery-header';
import { DiscoverySection } from '@/components/discovery/discovery-section';
import { DiscoverySkeleton } from '@/components/discovery/discovery-skeleton';
import { EventFilterSheet } from '@/components/discovery/event-filter-sheet';
import { EventResultCard } from '@/components/discovery/event-result-card';
import { EventSearchBar } from '@/components/discovery/event-search-bar';
import { FeaturedEventCarousel } from '@/components/event/featured-event-carousel';
import { FeaturedEventCard } from '@/components/event/featured-event-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getVietnamProvince,
  VIETNAM_PROVINCES,
} from '@/constants/vietnam-provinces';
import { useDiscoveryCity } from '@/hooks/use-discovery-city';
import { eventsKeys, listEvents, type EventSummary } from '@/lib/api/events';
import { toUserMessage } from '@/lib/api/error-message';
import {
  buildDiscoverySections,
  countActiveFilters,
  DEFAULT_DISCOVERY_FILTERS,
  filterAndSortEvents,
  isResultMode,
  type CategoryFilter,
  type DiscoveryFilters,
} from '@/lib/discovery';

const CONTAINER_PADDING = 20;
const LIST_CONTENT_STYLE = {
  paddingHorizontal: CONTAINER_PADDING,
  paddingVertical: 20,
} as const;
const GRID_CONTENT_STYLE = {
  ...LIST_CONTENT_STYLE,
  gap: 16,
} as const;
const GRID_COLUMN_STYLE = { gap: 16 } as const;
const LIST_HEADER_STYLE = { marginBottom: 16 } as const;
const HORIZONTAL_CONTENT_STYLE = { gap: 12, paddingRight: CONTAINER_PADDING } as const;
const EMPTY_EVENTS: EventSummary[] = [];

function ItemSeparator() {
  return <View className="h-3" />;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<EventSummary>>(null);
  const isWide = width >= 768;
  const columns = !isWide ? 1 : width >= 1200 ? 4 : 3;
  const isGrid = columns > 1;
  const gridCellWidth =
    (Math.min(width, 1200) -
      CONTAINER_PADDING * 2 -
      (columns - 1) * GRID_COLUMN_STYLE.gap) /
    columns;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const { selectedCity, setSelectedCity, isHydrated } = useDiscoveryCity();

  const eventsQuery = useQuery({
    queryKey: eventsKeys.list({}),
    queryFn: () => listEvents(),
  });
  const hasResolvedData = eventsQuery.data !== undefined;
  const events = eventsQuery.data ?? EMPTY_EVENTS;
  const sections = useMemo(
    () => buildDiscoverySections(events, selectedCity),
    [events, selectedCity],
  );
  const filteredResults = useMemo(
    () =>
      filterAndSortEvents(events, {
        ...filters,
        query,
        city: selectedCity,
        category,
      }),
    [category, events, filters, query, selectedCity],
  );
  const showingResults = isResultMode(query, category, filters);
  const activeFilterCount = countActiveFilters(filters);
  const displayedEvents = showingResults ? filteredResults : sections.all;

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ animated: true, offset: 0 });
  }, []);

  useEffect(() => {
    if (!isHydrated || !selectedCity) return;

    const canonicalProvince = getVietnamProvince(selectedCity);
    if (!canonicalProvince) {
      setSelectedCity(null);
    } else if (canonicalProvince !== selectedCity) {
      setSelectedCity(canonicalProvince);
    }
  }, [isHydrated, selectedCity, setSelectedCity]);

  const applyPreset = useCallback(
    (preset: DiscoveryFilters) => {
      setQuery('');
      setCategory('ALL');
      setFilters(preset);
      scrollToTop();
    },
    [scrollToTop],
  );

  const listHeader = !hasResolvedData ? null : (
    <View className="gap-6">
      {eventsQuery.isError ? (
        <Pressable
          accessibilityLabel={t('home.refreshError')}
          accessibilityRole="button"
          className="min-h-touch-target-min flex-row items-center gap-2 rounded-ctl bg-error-container px-4 py-2 active:opacity-80"
          onPress={() => void eventsQuery.refetch()}
        >
          <MaterialIcons name="refresh" size={18} className="text-on-error-container" />
          <Text className="min-w-0 flex-1 font-sans text-label-md text-on-error-container">
            {t('home.refreshError')}
          </Text>
        </Pressable>
      ) : null}

      {showingResults ? (
        <View className="gap-1">
          <Text
            accessibilityRole="header"
            className="font-semibold text-headline-md text-on-surface"
          >
            {t('home.results')}
          </Text>
          <Text className="font-sans text-label-md text-on-surface-variant">
            {t('home.resultCount', { count: filteredResults.length })}
          </Text>
        </View>
      ) : (
        <>
          {sections.featured.length > 0 ? (
            <DiscoverySection title={t('home.featured')}>
              <FeaturedEventCarousel events={sections.featured} />
            </DiscoverySection>
          ) : null}

          {sections.thisWeek.length > 0 ? (
            <DiscoverySection
              actionAccessibilityLabel={t('home.seeAllThisWeek')}
              actionLabel={t('home.seeAll')}
              onPressAction={() =>
                applyPreset({
                  ...DEFAULT_DISCOVERY_FILTERS,
                  time: 'THIS_WEEK',
                })
              }
              title={t('home.thisWeek')}
            >
              <FlatList
                horizontal
                data={sections.thisWeek}
                keyExtractor={(event) => event.id}
                renderItem={({ item }) => <CompactEventCard event={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={HORIZONTAL_CONTENT_STYLE}
              />
            </DiscoverySection>
          ) : null}

          {sections.free.length > 0 ? (
            <DiscoverySection
              actionAccessibilityLabel={t('home.seeAllFreeEvents')}
              actionLabel={t('home.seeAll')}
              onPressAction={() =>
                applyPreset({
                  ...DEFAULT_DISCOVERY_FILTERS,
                  price: 'FREE',
                })
              }
              title={t('home.freeEvents')}
            >
              <FlatList
                horizontal
                data={sections.free}
                keyExtractor={(event) => event.id}
                renderItem={({ item }) => <CompactEventCard event={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={HORIZONTAL_CONTENT_STYLE}
              />
            </DiscoverySection>
          ) : null}

          {sections.all.length > 0 ? (
            <View className="min-h-touch-target-min justify-center">
              <Text
                accessibilityRole="header"
                className="font-semibold text-headline-md text-on-surface"
              >
                {t('home.allEvents')}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const listEmpty = eventsQuery.isPending ? (
    <DiscoverySkeleton />
  ) : eventsQuery.isError && !hasResolvedData ? (
    <EmptyState
      icon="cloud-off"
      title={t('home.loadErrorTitle')}
      description={toUserMessage(eventsQuery.error, t)}
      action={
        <Button label={t('common.retry')} onPress={() => void eventsQuery.refetch()} />
      }
    />
  ) : showingResults ? (
    <EmptyState
      icon="search-off"
      title={t('home.emptyTitle')}
      description={
        query.trim() && category === 'ALL' && activeFilterCount === 0
          ? t('home.noResults', { query: query.trim() })
          : t('home.noFilteredResults')
      }
    />
  ) : (
    <EmptyState
      icon="event-busy"
      title={t('home.emptyTitle')}
      description={
        selectedCity
          ? t('home.noEventsInCity', { city: selectedCity })
          : t('home.emptyDescription')
      }
    />
  );

  return (
    <>
      <SafeAreaView edges={['top']} className="flex-1 bg-surface">
        <View
          className={`w-full flex-1 self-center ${isWide ? 'max-w-wide' : 'max-w-content'}`}
        >
          <View className="gap-3 border-b border-outline-variant px-container-padding pb-3">
            <DiscoveryHeader
              selectedCity={selectedCity}
              onOpenCityPicker={() => setCityPickerVisible(true)}
            />
            <EventSearchBar
              activeFilterCount={activeFilterCount}
              query={query}
              onChangeQuery={(nextQuery) => {
                setQuery(nextQuery);
                scrollToTop();
              }}
              onOpenFilters={() => setFilterSheetVisible(true)}
            />
            <CategorySelector
              value={category}
              onChange={(nextCategory) => {
                setCategory(nextCategory);
                scrollToTop();
              }}
            />
          </View>

          <FlatList
            ref={listRef}
            key={columns}
            data={displayedEvents}
            keyExtractor={(event) => event.id}
            numColumns={columns}
            columnWrapperStyle={isGrid ? GRID_COLUMN_STYLE : undefined}
            renderItem={({ item }) =>
              isGrid ? (
                <View style={{ width: gridCellWidth }}>
                  <FeaturedEventCard event={item} fullWidth />
                </View>
              ) : (
                <EventResultCard event={item} />
              )
            }
            ItemSeparatorComponent={isGrid ? undefined : ItemSeparator}
            ListHeaderComponent={listHeader}
            ListHeaderComponentStyle={listHeader ? LIST_HEADER_STYLE : undefined}
            ListEmptyComponent={listEmpty}
            refreshing={eventsQuery.isRefetching && !eventsQuery.isPending}
            onRefresh={() => void eventsQuery.refetch()}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={isGrid ? GRID_CONTENT_STYLE : LIST_CONTENT_STYLE}
          />
        </View>
      </SafeAreaView>

      <CityPickerSheet
        cities={[...VIETNAM_PROVINCES]}
        selectedCity={selectedCity}
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        onSelect={(city) => {
          setSelectedCity(city);
          scrollToTop();
        }}
      />
      <EventFilterSheet
        value={filters}
        visible={filterSheetVisible}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          scrollToTop();
        }}
        onClose={() => setFilterSheetVisible(false)}
      />
    </>
  );
}
