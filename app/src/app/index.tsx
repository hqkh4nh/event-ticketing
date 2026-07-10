import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-2xl font-semibold text-slate-900">
          {t('home.title')}
        </Text>
        <Text className="text-sm text-slate-500">
          {t('home.subtitle')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
