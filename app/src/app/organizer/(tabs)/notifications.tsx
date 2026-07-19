import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';

export default function OrganizerNotificationsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="border-b border-outline-variant px-container-padding py-4">
          <Text className="font-bold text-display-sm text-on-surface">
            {t('organizer.notifications.title')}
          </Text>
        </View>

        <View className="flex-1 justify-center">
          <EmptyState
            icon="notifications-none"
            title={t('organizer.notifications.emptyTitle')}
            description={t('organizer.notifications.emptyDescription')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
