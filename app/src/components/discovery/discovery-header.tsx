import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Wordmark } from '@/components/brand/logo-mark';

type DiscoveryHeaderProps = {
  selectedCity: string | null;
  onOpenCityPicker: () => void;
};

export function DiscoveryHeader({
  selectedCity,
  onOpenCityPicker,
}: DiscoveryHeaderProps) {
  const { t } = useTranslation();
  const cityLabel = selectedCity ?? t('home.allCities');

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Wordmark className="text-display-sm" />

      <Pressable
        accessibilityLabel={t('home.selectedCity', { city: cityLabel })}
        accessibilityRole="button"
        className="h-touch-target-min max-w-48 flex-row items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 active:bg-surface-container"
        onPress={onOpenCityPicker}
      >
        <MaterialIcons name="location-on" size={18} className="text-primary" />
        <Text
          numberOfLines={1}
          className="shrink font-medium text-label-md text-on-surface"
        >
          {cityLabel}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} className="text-on-surface-variant" />
      </Pressable>
    </View>
  );
}
