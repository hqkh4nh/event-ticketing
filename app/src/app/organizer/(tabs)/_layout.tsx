import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  AppTabIcon,
  useAppTabScreenOptions,
} from '@/components/navigation/app-tab-bar';

export default function OrganizerTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppTabScreenOptions();

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
