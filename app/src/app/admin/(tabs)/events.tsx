import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminEventCard } from '@/components/admin/admin-event-card';
import { AdminScreenHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminKeys,
  approveAdminEvent,
  type AdminEvent,
  type AdminEventStatus,
  listAdminEvents,
  updateAdminEventFeatured,
} from '@/lib/api/admin';
import { toUserMessage } from '@/lib/api/error-message';

type EventFilter = 'ALL' | AdminEventStatus;

const FILTERS: EventFilter[] = [
  'ALL',
  'PENDING_REVIEW',
  'PUBLISHED',
  'DRAFT',
  'HIDDEN',
  'CANCELLED',
];
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_LIMIT = 100;

type Feedback = {
  message: string;
  tone: 'success' | 'error';
};

export default function AdminEventsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<EventFilter>('ALL');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingFeatureEvent, setPendingFeatureEvent] =
    useState<AdminEvent | null>(null);
  const [pendingApprovalEvent, setPendingApprovalEvent] =
    useState<AdminEvent | null>(null);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const queryParams = useMemo(
    () => ({
      status: filter === 'ALL' ? undefined : filter,
      search: debouncedQuery || undefined,
      page: 1,
      limit: PAGE_LIMIT,
    }),
    [debouncedQuery, filter],
  );

  const eventsQuery = useQuery({
    queryKey: adminKeys.eventList(queryParams),
    queryFn: () => listAdminEvents(queryParams),
  });

  const featuredMutation = useMutation({
    mutationFn: ({
      id,
      featured,
    }: {
      id: string;
      featured: boolean;
    }) => updateAdminEventFeatured(id, featured),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.events() });
      setPendingFeatureEvent(null);
      setFeedback({
        tone: 'success',
        message: variables.featured
          ? t('admin.events.featuredSuccess')
          : t('admin.events.unfeaturedSuccess'),
      });
    },
    onError: (error) => {
      setPendingFeatureEvent(null);
      setFeedback({ tone: 'error', message: toUserMessage(error, t) });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (id: string) => approveAdminEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.events() });
      setPendingApprovalEvent(null);
      setFeedback({
        tone: 'success',
        message: t('admin.events.approvedSuccess'),
      });
    },
    onError: (error) => {
      setPendingApprovalEvent(null);
      setFeedback({ tone: 'error', message: toUserMessage(error, t) });
    },
  });

  const events = eventsQuery.data?.items ?? [];
  const total = eventsQuery.data?.total ?? 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-wide flex-1 self-center">
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
          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              className={[
                'flex-row items-center gap-2 rounded-lg px-4 py-3',
                feedback.tone === 'success'
                  ? 'bg-success-container'
                  : 'bg-error-container',
              ].join(' ')}
            >
              <MaterialIcons
                name={feedback.tone === 'success' ? 'check-circle' : 'error'}
                size={19}
                className={
                  feedback.tone === 'success'
                    ? 'text-on-success-container'
                    : 'text-on-error-container'
                }
              />
              <Text
                className={[
                  'min-w-0 flex-1 font-medium text-label-md',
                  feedback.tone === 'success'
                    ? 'text-on-success-container'
                    : 'text-on-error-container',
                ].join(' ')}
              >
                {feedback.message}
              </Text>
              <Pressable
                accessibilityLabel={t('common.done')}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setFeedback(null)}
              >
                <MaterialIcons
                  name="close"
                  size={19}
                  className={
                    feedback.tone === 'success'
                      ? 'text-on-success-container'
                      : 'text-on-error-container'
                  }
                />
              </Pressable>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.events.searchLabel')}
            </Text>
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-4">
              <MaterialIcons
                name="search"
                size={21}
                className="text-on-surface-variant"
              />
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
                  <MaterialIcons
                    name="cancel"
                    size={19}
                    className="text-outline"
                  />
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

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(value)}
                  className={[
                    'h-touch-target-min items-center justify-center rounded-full border px-4',
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
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('admin.events.resultTitle')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.events.resultCount', { count: total })}
            </Text>
          </View>

          {eventsQuery.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : eventsQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('admin.events.loadErrorTitle')}
              description={toUserMessage(eventsQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void eventsQuery.refetch()}
                />
              }
            />
          ) : events.length ? (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {events.map((event) => {
                const busy =
                  (featuredMutation.isPending &&
                    featuredMutation.variables?.id === event.id) ||
                  (approvalMutation.isPending &&
                    approvalMutation.variables === event.id);

                return (
                  <View key={event.id} className="w-full md:w-[48%]">
                    <AdminEventCard
                      event={event}
                      busy={busy}
                      statusLabel={t(`admin.eventStatus.${event.status}`)}
                      soldLabel={t('admin.events.sold', {
                        sold: event.sold,
                        capacity: event.capacity,
                      })}
                      featuredLabel={t('admin.events.featured')}
                      featureLabel={t('admin.actions.feature')}
                      unfeatureLabel={t('admin.actions.unfeature')}
                      approveLabel={t('admin.actions.approveEvent')}
                      openLabel={t('admin.events.openDetail', {
                        event: event.title,
                      })}
                      formattedDate={new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(event.startAt))}
                      onToggleFeatured={() => {
                        setFeedback(null);
                        if (event.featured) {
                          featuredMutation.mutate({
                            id: event.id,
                            featured: false,
                          });
                        } else {
                          setPendingFeatureEvent(event);
                        }
                      }}
                      onApprove={() => {
                        setFeedback(null);
                        setPendingApprovalEvent(event);
                      }}
                      onOpen={() => router.push(`/admin/events/${event.id}`)}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="event-busy"
              title={t('admin.events.emptyTitle')}
              description={t('admin.events.emptyDescription')}
            />
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={pendingFeatureEvent !== null}
        title={t('admin.events.confirmFeatureTitle')}
        description={t('admin.events.confirmFeatureDescription', {
          event: pendingFeatureEvent?.title ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.events.confirmFeatureAction')}
        icon="star"
        tone="primary"
        loading={featuredMutation.isPending}
        onCancel={() => setPendingFeatureEvent(null)}
        onConfirm={() => {
          if (!pendingFeatureEvent) return;
          featuredMutation.mutate({
            id: pendingFeatureEvent.id,
            featured: true,
          });
        }}
      />
      <ConfirmDialog
        visible={pendingApprovalEvent !== null}
        title={t('admin.events.confirmApproveTitle')}
        description={t('admin.events.confirmApproveDescription', {
          event: pendingApprovalEvent?.title ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.approveEvent')}
        icon="verified"
        tone="primary"
        loading={approvalMutation.isPending}
        onCancel={() => setPendingApprovalEvent(null)}
        onConfirm={() => {
          if (!pendingApprovalEvent) return;
          approvalMutation.mutate(pendingApprovalEvent.id);
        }}
      />
    </SafeAreaView>
  );
}
