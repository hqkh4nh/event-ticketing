import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface dark:bg-d-surface">
      <View className="flex-1 gap-6 px-container-padding py-6">
        <Text className="font-bold text-[24px] leading-8 text-on-surface dark:text-d-on-surface">
          {t('profile.title')}
        </Text>

        <View className="gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 dark:border-d-outline-variant dark:bg-d-surface-container">
          <Text className="font-semibold text-[16px] leading-6 text-on-surface dark:text-d-on-surface">
            {user?.fullName}
          </Text>
          <Text className="font-sans text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
            {user?.email}
          </Text>
        </View>

        <Button
          variant="outline"
          label={t('profile.signOut')}
          onPress={() => void signOut()}
        />
      </View>
    </SafeAreaView>
  );
}
