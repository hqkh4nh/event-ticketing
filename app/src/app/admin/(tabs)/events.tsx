import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminEventCard } from '@/components/admin/admin-event-card';
import { AdminScreenHeader } from '@/components/admin/admin-ui';
import {
  ADMIN_EVENTS,
  type AdminEvent,
  type AdminEventStatus,
} from '@/lib/mock/admin';

type EventFilter = 'ALL' | AdminEventStatus;

const FILTERS: EventFilter[] = ['ALL', 'PUBLISHED', 'DRAFT', 'HIDDEN', 'CANCELLED'];

export default function AdminEventsScreen() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState(ADMIN_EVENTS);
  const [filter, setFilter] = useState<EventFilter>('ALL');
  const [query, setQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesFilter = filter === 'ALL' || event.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.organizerName.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [events, filter, query]);

  function updateEvent(id: string, update: (event: AdminEvent) => AdminEvent) {
    setEvents((current) => current.map((event) => (event.id === id ? update(event) : event)));
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-5xl flex-1 self-center">
        <AdminScreenHeader
          eyebrow={t('admin.brand')}
          title={t('admin.events.title')}
          description={t('admin.events.description')}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-container-padding py-6"
        >
          <View className="gap-2">
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.events.searchLabel')}
            </Text>
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-4">
              <MaterialIcons name="search" size={21} className="text-on-surface-variant" />
              <TextInput
                accessibilityLabel={t('admin.events.searchLabel')}
                className="min-w-0 flex-1 font-sans text-body-md text-on-surface"
                placeholder={t('admin.events.searchPlaceholder')}
                placeholderClassName="text-on-surface-variant"
                value={query}
                onChangeText={setQuery}
              />
              {query ? (
                <Pressable
                  accessibilityLabel={t('admin.events.clearSearch')}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setQuery('')}
                >
                  <MaterialIcons name="cancel" size={19} className="text-outline" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {FILTERS.map((value) => {
              const selected = value === filter;
              const count =
                value === 'ALL'
                  ? events.length
                  : events.filter((event) => event.status === value).length;

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(value)}
                  className={[
                    'h-touch-target-min flex-row items-center justify-center gap-2 rounded-full border px-4',
                    selected
                      ? 'border-primary bg-primary'
                      : 'border-outline-variant bg-surface-container-lowest',
                  ].join(' ')}
                >
                  <Text
                    className={`font-semibold text-label-md ${
                      selected ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    {t(`admin.eventFilters.${value}`)}
                  </Text>
                  <Text
                    className={`font-semibold text-label-sm ${
                      selected ? 'text-on-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('admin.events.resultTitle')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.events.resultCount', { count: filteredEvents.length })}
            </Text>
          </View>

          {filteredEvents.length ? (
            <View className="gap-3">
              {filteredEvents.map((event) => (
                <AdminEventCard
                  key={event.id}
                  event={event}
                  statusLabel={t(`admin.eventStatus.${event.status}`)}
                  soldLabel={t('admin.events.sold', {
                    sold: event.sold,
                    capacity: event.capacity,
                  })}
                  featuredLabel={t('admin.events.featured')}
                  hideLabel={t('admin.actions.hide')}
                  showLabel={t('admin.actions.show')}
                  featureLabel={t('admin.actions.feature')}
                  unfeatureLabel={t('admin.actions.unfeature')}
                  formattedDate={new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(event.startAt))}
                  onToggleHidden={() =>
                    updateEvent(event.id, (current) => ({
                      ...current,
                      status: current.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN',
                    }))
                  }
                  onToggleFeatured={() =>
                    updateEvent(event.id, (current) => ({
                      ...current,
                      featured: !current.featured,
                    }))
                  }
                />
              ))}
            </View>
          ) : (
            <View className="items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-12">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container">
                <MaterialIcons name="event-busy" size={28} className="text-on-surface-variant" />
              </View>
              <Text className="text-center font-semibold text-body-lg text-on-surface">
                {t('admin.events.emptyTitle')}
              </Text>
              <Text className="text-center font-sans text-label-md text-on-surface-variant">
                {t('admin.events.emptyDescription')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
