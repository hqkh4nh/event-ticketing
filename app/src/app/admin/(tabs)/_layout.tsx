import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTabIcon } from '@/components/navigation/app-tab-bar';
import { useTokens } from '@/hooks/use-tokens';
import { adminKeys, listAdminOrganizers } from '@/lib/api/admin';
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_POLL_INTERVAL_MS,
  notificationsKeys,
} from '@/lib/api/notifications';
import { listAdminWithdrawals, withdrawalKeys } from '@/lib/api/withdrawals';

const SIDEBAR_BREAKPOINT = 900;
const PENDING_COUNT_QUERY = { status: 'PENDING', page: 1, limit: 1 } as const;

export default function AdminTabsLayout() {
  const { t } = useTranslation();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= SIDEBAR_BREAKPOINT;
  const pendingQuery = useQuery({
    queryKey: adminKeys.organizerList(PENDING_COUNT_QUERY),
    queryFn: () => listAdminOrganizers(PENDING_COUNT_QUERY),
  });
  const pendingCount = pendingQuery.data?.total;
  const pendingWithdrawalsQuery = useQuery({
    queryKey: withdrawalKeys.adminList(PENDING_COUNT_QUERY),
    queryFn: () => listAdminWithdrawals(PENDING_COUNT_QUERY),
  });
  const pendingWithdrawalCount = pendingWithdrawalsQuery.data?.total;
  const unreadQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: getUnreadNotificationCount,
    refetchOnMount: 'always',
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  const unreadCount = unreadQuery.data?.count;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.surface },
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarLabelPosition: isWide ? 'beside-icon' : 'below-icon',
        tabBarVariant: isWide ? 'material' : 'uikit',
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens['on-surface-variant'],
        tabBarActiveBackgroundColor: isWide ? tokens['primary-container'] : undefined,
        tabBarStyle: isWide
          ? {
              width: 248,
              paddingTop: insets.top + 24,
              paddingHorizontal: 12,
              backgroundColor: tokens['surface-container-lowest'],
              borderRightColor: tokens['outline-variant'],
            }
          : {
              height: 80 + insets.bottom,
              paddingTop: 8,
              paddingBottom: insets.bottom,
              backgroundColor: tokens.surface,
              borderTopColor: tokens['outline-variant'],
            },
        tabBarItemStyle: isWide
          ? {
              minHeight: 52,
              marginBottom: 8,
              borderRadius: 16,
            }
          : undefined,
        tabBarLabelStyle: {
          fontFamily: 'BeVietnamPro_500Medium',
          fontSize: isWide ? 14 : 12,
        },
        tabBarIconStyle: {
          width: 32,
          height: 32,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('admin.tabs.overview'),
          tabBarIcon: (props) => <AppTabIcon name="dashboard" {...props} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t('admin.tabs.accounts'),
          tabBarBadge: pendingCount ? pendingCount : undefined,
          tabBarIcon: (props) => <AppTabIcon name="manage-accounts" {...props} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('admin.tabs.events'),
          tabBarIcon: (props) => <AppTabIcon name="event-note" {...props} />,
        }}
      />
      <Tabs.Screen
        name="withdrawals"
        options={{
          title: t('admin.tabs.withdrawals'),
          tabBarBadge: pendingWithdrawalCount ? pendingWithdrawalCount : undefined,
          tabBarIcon: (props) => (
            <AppTabIcon name="account-balance-wallet" {...props} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('admin.tabs.notifications'),
          tabBarBadge: unreadCount ? unreadCount : undefined,
          tabBarIcon: (props) => <AppTabIcon name="notifications" {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('admin.tabs.profile'),
          tabBarIcon: (props) => <AppTabIcon name="admin-panel-settings" {...props} />,
        }}
      />
    </Tabs>
  );
}
