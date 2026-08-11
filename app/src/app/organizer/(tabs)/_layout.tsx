import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  AppTabIcon,
  useAppTabScreenOptions,
} from '@/components/navigation/app-tab-bar';
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_POLL_INTERVAL_MS,
  notificationsKeys,
} from '@/lib/api/notifications';

export default function OrganizerTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppTabScreenOptions();
  const unreadQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: getUnreadNotificationCount,
    refetchOnMount: 'always',
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  const unreadCount = unreadQuery.data?.count;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('organizer.tabs.overview'),
          tabBarIcon: (props) => <AppTabIcon name="dashboard" {...props} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('organizer.tabs.events'),
          tabBarIcon: (props) => <AppTabIcon name="event-note" {...props} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('organizer.tabs.notifications'),
          tabBarBadge: unreadCount ? unreadCount : undefined,
          tabBarIcon: (props) => <AppTabIcon name="notifications" {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('organizer.tabs.account'),
          tabBarIcon: (props) => <AppTabIcon name="manage-accounts" {...props} />,
        }}
      />
    </Tabs>
  );
}
