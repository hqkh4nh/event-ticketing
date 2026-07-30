import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTokens } from '@/hooks/use-tokens';
import { isSameVietnamProvince } from '@/constants/vietnam-provinces';

type CityPickerSheetProps = {
  visible: boolean;
  cities: string[];
  selectedCity: string | null;
  onSelect: (city: string | null) => void;
  onClose: () => void;
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .trim();
}

export function CityPickerSheet({
  visible,
  cities,
  selectedCity,
  onSelect,
  onClose,
}: CityPickerSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const tokens = useTokens();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filteredCities = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return cities;

    return cities.filter((city) => normalizeSearch(city).includes(normalizedQuery));
  }, [cities, query]);

  const chooseCity = (city: string | null) => {
    onSelect(city);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <Pressable
          accessibilityLabel={t('common.cancel')}
          accessibilityRole="button"
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
        />

        <SafeAreaView
          accessibilityViewIsModal
          edges={['bottom']}
          style={[themes[colorScheme], { maxHeight: '80%' }]}
          className="w-full overflow-hidden rounded-t-xl bg-surface"
        >
          <View className="min-h-touch-target-min flex-row items-center justify-between border-b border-outline-variant px-container-padding py-2">
            <Text className="flex-1 font-semibold text-headline-md text-on-surface">
              {t('home.chooseCity')}
            </Text>
            <Pressable
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
              className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full active:bg-surface-container"
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} className="text-on-surface" />
            </Pressable>
          </View>

          <View className="border-b border-outline-variant px-container-padding py-3">
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4">
              <MaterialIcons name="search" size={20} className="text-on-surface-variant" />
              <TextInput
                accessibilityLabel={t('home.searchCity')}
                className="h-full flex-1 py-0 font-sans text-body-md text-on-surface"
                onChangeText={setQuery}
                placeholder={t('home.searchCity')}
                placeholderTextColor={tokens['on-surface-variant']}
                returnKeyType="search"
                textAlignVertical="center"
                value={query}
              />
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" className="shrink">
            <View className="px-container-padding py-2">
              <CityOption
                label={t('home.allCities')}
                onPress={() => chooseCity(null)}
                selected={selectedCity === null}
              />
              {filteredCities.map((city) => (
                <CityOption
                  key={city}
                  label={city}
                  onPress={() => chooseCity(city)}
                  selected={Boolean(
                    selectedCity && isSameVietnamProvince(city, selectedCity),
                  )}
                />
              ))}
              {filteredCities.length === 0 ? (
                <Text className="px-4 py-8 text-center font-sans text-body-md text-on-surface-variant">
                  {t('home.noCities')}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type CityOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function CityOption({ label, selected, onPress }: CityOptionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        'min-h-touch-target-min flex-row items-center gap-3 rounded-lg px-4 py-2 active:bg-surface-container',
        selected ? 'bg-primary-container' : '',
      ].join(' ')}
      onPress={onPress}
    >
      <MaterialIcons
        name="location-on"
        size={20}
        className={selected ? 'text-on-primary-container' : 'text-on-surface-variant'}
      />
      <Text
        numberOfLines={1}
        className={[
          'flex-1 font-medium text-body-md',
          selected ? 'text-on-primary-container' : 'text-on-surface',
        ].join(' ')}
      >
        {label}
      </Text>
      {selected ? (
        <MaterialIcons name="check" size={21} className="text-on-primary-container" />
      ) : null}
    </Pressable>
  );
}
