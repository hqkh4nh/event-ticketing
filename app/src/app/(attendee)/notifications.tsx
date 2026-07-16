import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function NotificationsScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      icon="notifications-none"
      title={t('notifications.emptyTitle')}
      description={t('notifications.emptyDescription')}
    />
  );
}
