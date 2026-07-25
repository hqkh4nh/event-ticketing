import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

import { AdminAccountCard } from '@/components/admin/admin-account-card';
import { AdminScreenHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminKeys,
  listAdminOrganizers,
  type AdminOrganizer,
  type AdminOrganizerStatus,
  updateAdminOrganizerStatus,
  type UpdateAdminOrganizerStatus,
} from '@/lib/api/admin';
import { toUserMessage } from '@/lib/api/error-message';

const FILTERS: AdminOrganizerStatus[] = ['PENDING', 'ACTIVE', 'BLOCKED'];
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_LIMIT = 100;

type Feedback = {
  message: string;
  tone: 'success' | 'error';
};

export default function AdminAccountsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminOrganizerStatus>('PENDING');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const queryParams = useMemo(
    () => ({
      status: filter,
      search: debouncedQuery || undefined,
      page: 1,
      limit: PAGE_LIMIT,
    }),
    [debouncedQuery, filter],
  );

  const organizersQuery = useQuery({
    queryKey: adminKeys.organizerList(queryParams),
    queryFn: () => listAdminOrganizers(queryParams),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: UpdateAdminOrganizerStatus;
    }) => updateAdminOrganizerStatus(id, status),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.organizers() });
      setFeedback({
        tone: 'success',
        message:
          variables.status === 'BLOCKED'
            ? t('admin.accounts.accountBlocked')
            : filter === 'BLOCKED'
              ? t('admin.accounts.accountRestored')
              : t('admin.accounts.organizerApproved'),
      });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: toUserMessage(error, t) });
    },
  });

  const organizers = organizersQuery.data?.items ?? [];
  const total = organizersQuery.data?.total ?? 0;

  function organizerDetail(account: AdminOrganizer): string {
    const joinedAt = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
    }).format(new Date(account.createdAt));

    return t('admin.accounts.organizerDetail', {
      count: account.eventCount,
      date: joinedAt,
    });
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-5xl flex-1 self-center">
        <AdminScreenHeader
          eyebrow={t('admin.brand')}
          title={t('admin.accounts.title')}
          description={t('admin.accounts.description')}
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
              {t('admin.accounts.searchLabel')}
            </Text>
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-4">
              <MaterialIcons name="search" size={21} className="text-on-surface-variant" />
              <TextInput
                accessibilityLabel={t('admin.accounts.searchLabel')}
                autoCapitalize="none"
                className="min-w-0 flex-1 font-sans text-body-md text-on-surface"
                placeholder={t('admin.accounts.searchPlaceholder')}
                placeholderClassName="text-on-surface-variant"
                value={query}
                onChangeText={setQuery}
              />
              {query ? (
                <Pressable
                  accessibilityLabel={t('admin.accounts.clearSearch')}
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
                    {t(`admin.accountFilters.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('admin.accounts.resultTitle')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.accounts.resultCount', { count: total })}
            </Text>
          </View>

          {organizersQuery.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : organizersQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('admin.accounts.loadErrorTitle')}
              description={toUserMessage(organizersQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void organizersQuery.refetch()}
                />
              }
            />
          ) : organizers.length ? (
            <View className="gap-3">
              {organizers.map((account) => {
                const busy =
                  statusMutation.isPending &&
                  statusMutation.variables?.id === account.id;

                return (
                  <AdminAccountCard
                    key={account.id}
                    account={account}
                    busy={busy}
                    detail={organizerDetail(account)}
                    roleLabel={t('admin.roles.ORGANIZER')}
                    statusLabel={t(`admin.status.${account.status}`)}
                    approveLabel={t('admin.actions.approve')}
                    blockLabel={t('admin.actions.block')}
                    restoreLabel={t('admin.actions.restore')}
                    onApprove={() =>
                      statusMutation.mutate({ id: account.id, status: 'ACTIVE' })
                    }
                    onToggleBlock={() =>
                      statusMutation.mutate({
                        id: account.id,
                        status: account.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
                      })
                    }
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="person-search"
              title={t('admin.accounts.emptyTitle')}
              description={t('admin.accounts.emptyDescription')}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
