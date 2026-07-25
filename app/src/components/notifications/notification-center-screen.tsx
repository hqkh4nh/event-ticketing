import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsKeys,
  type AppNotification,
} from '@/lib/api/notifications';
import { toUserMessage } from '@/lib/api/error-message';

const LIST_QUERY = { page: 1, limit: 100 } as const;

export function NotificationCenterScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: notificationsKeys.list(LIST_QUERY),
    queryFn: () => listNotifications(LIST_QUERY),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationsKeys.all });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void refresh(),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void refresh(),
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  function renderNotification(item: AppNotification) {
    const busy = markRead.isPending && markRead.variables === item.id;
    const eventTitle = item.data?.eventTitle;
    const content =
      item.type === 'EVENT_FEATURED' && typeof eventTitle === 'string'
        ? {
            title: t('notifications.types.EVENT_FEATURED.title'),
            body: t('notifications.types.EVENT_FEATURED.body', { eventTitle }),
          }
        : { title: item.title, body: item.body };

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => {
          if (!item.read) markRead.mutate(item.id);
        }}
        className={[
          'flex-row gap-3 border-b border-outline-variant px-container-padding py-4',
          item.read ? 'bg-surface' : 'bg-primary-container/30',
          busy ? 'opacity-50' : '',
        ].join(' ')}
      >
        <View
          className={[
            'h-11 w-11 items-center justify-center rounded-full',
            item.read ? 'bg-surface-container' : 'bg-primary-container',
          ].join(' ')}
        >
          <MaterialIcons
            name={item.type === 'EVENT_FEATURED' ? 'star' : 'notifications'}
            size={21}
            className={item.read ? 'text-on-surface-variant' : 'text-primary'}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-start gap-2">
            <Text
              className="min-w-0 flex-1 font-semibold text-body-md text-on-surface"
            >
              {content.title}
            </Text>
            {!item.read ? (
              <View
                accessibilityLabel={t('notifications.unread')}
                className="mt-1.5 h-2.5 w-2.5 rounded-full bg-error"
              />
            ) : null}
          </View>
          <Text className="font-sans text-label-md text-on-surface-variant">
            {content.body}
          </Text>
          <Text className="font-sans text-label-sm text-outline">
            {new Intl.DateTimeFormat(i18n.language, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(item.createdAt))}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="min-h-16 flex-row items-center justify-between gap-4 border-b border-outline-variant px-container-padding py-4">
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-display-sm text-on-surface">
              {t('notifications.title')}
            </Text>
            {unreadCount > 0 ? (
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {t('notifications.unreadCount', { count: unreadCount })}
              </Text>
            ) : null}
          </View>
          {unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={markAllRead.isPending}
              onPress={() => markAllRead.mutate()}
              className="min-h-touch-target-min justify-center active:opacity-60"
            >
              <Text className="font-semibold text-label-md text-primary">
                {t('notifications.markAllRead')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {notificationsQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator className="text-primary" />
          </View>
        ) : notificationsQuery.isError ? (
          <View className="flex-1 justify-center px-container-padding">
            <EmptyState
              icon="cloud-off"
              title={t('notifications.loadErrorTitle')}
              description={toUserMessage(notificationsQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void notificationsQuery.refetch()}
                />
              }
            />
          </View>
        ) : notifications.length ? (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderNotification(item)}
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => void notificationsQuery.refetch()}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center px-container-padding">
            <EmptyState
              icon="notifications-none"
              title={t('notifications.emptyTitle')}
              description={t('notifications.emptyDescription')}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
