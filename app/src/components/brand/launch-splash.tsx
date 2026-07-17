import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/logo-mark';

type Props = {
  onComplete: () => void;
};

const illustration = require('../../../assets/images/launch-event-illustration.png');

export function LaunchSplash({ onComplete }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const illustrationHeight = Math.min(600, Math.max(400, Math.round(height * 0.7)));

  return (
    <View className="flex-1 bg-surface-container-lowest">
      <View className="w-full max-w-content flex-1 self-center px-container-padding">
        <View className="justify-end" style={{ height: insets.top + 52 }}>
          <LogoMark size={34} />
        </View>

        <View className="flex-1 items-center justify-center">
          <Image
            source={illustration}
            contentFit="contain"
            transition={250}
            style={{ height: illustrationHeight, width: '100%' }}
          />
        </View>

        <View className="items-center gap-3 pb-8">
          <Text className="max-w-md text-center font-bold text-display-sm text-on-surface">
            {t('launch.title')}
          </Text>
          <Text className="max-w-md text-center font-sans text-body-md leading-6 text-on-surface-variant">
            {t('launch.body')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('launch.start')}
          onPress={onComplete}
          className="h-cta-height flex-row items-center justify-center gap-2 rounded-full bg-primary px-6 active:scale-[0.98]"
          style={{ marginBottom: insets.bottom + 20 }}
        >
          <Text className="font-semibold text-body-md text-on-primary">{t('launch.start')}</Text>
          <MaterialIcons name="arrow-forward" size={22} className="text-on-primary" />
        </Pressable>
      </View>
    </View>
  );
}
