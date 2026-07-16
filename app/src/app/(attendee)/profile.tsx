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
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 gap-6 self-center px-container-padding py-6">
        <Text className="font-bold text-display-sm text-on-surface">{t('profile.title')}</Text>

        <View className="gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <Text className="font-semibold text-body-md text-on-surface">{user?.fullName}</Text>
          <Text className="font-sans text-label-md text-on-surface-variant">{user?.email}</Text>
        </View>

        <Button variant="outline" label={t('profile.signOut')} onPress={() => void signOut()} />
      </View>
    </SafeAreaView>
  );
}
