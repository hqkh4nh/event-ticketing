import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  AppTabIcon,
  useAppTabScreenOptions,
} from '@/components/navigation/app-tab-bar';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Attendee shell. Guarding here rather than on each screen means a tab added
 * later inherits the redirect without touching this file.
 *
 * Uses JS tabs rather than `expo-router/unstable-native-tabs`: native tabs are
 * alpha, and on web they fall back to a rough iPad-style bar. AC-19 puts web on
 * the same footing as the app, so that is not a trade this product can make.
 */
export default function AttendeeLayout() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);
  const { t } = useTranslation();
  const screenOptions = useAppTabScreenOptions();

  if (isLoading) return null;
  if (!token) return <Redirect href="/auth/login" />;
  // Organizers own a separate area. Both route groups would otherwise resolve
  // "/" to their own index, so an organizer landing on the attendee root is
  // sent on to theirs.
  if (role === 'ORGANIZER') return <Redirect href="/organizer" />;
  if (role === 'SCANNER') return <Redirect href="/scanner" />;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: (props) => <AppTabIcon name="explore" {...props} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: t('tabs.tickets'),
          tabBarIcon: (props) => <AppTabIcon name="confirmation-number" {...props} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications'),
          tabBarIcon: (props) => <AppTabIcon name="notifications" {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: (props) => <AppTabIcon name="person" {...props} />,
        }}
      />
    </Tabs>
  );
}
