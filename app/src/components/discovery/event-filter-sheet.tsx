import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DEFAULT_DISCOVERY_FILTERS,
  type DiscoveryFilters,
  type PriceFilter,
  type SortOption,
  type TimeFilter,
} from '@/lib/discovery';

type EventFilterSheetProps = {
  visible: boolean;
  value: DiscoveryFilters;
  onApply: (value: DiscoveryFilters) => void;
  onClose: () => void;
};

const TIME_OPTIONS: readonly TimeFilter[] = ['ALL', 'TODAY', 'THIS_WEEK', 'WEEKEND'];
const PRICE_OPTIONS: readonly PriceFilter[] = ['ALL', 'FREE', 'PAID'];
const SORT_OPTIONS: readonly SortOption[] = ['SOONEST', 'PRICE_ASC', 'PRICE_DESC'];

export function EventFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: EventFilterSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [draft, setDraft] = useState<DiscoveryFilters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const reset = () => {
    setDraft(DEFAULT_DISCOVERY_FILTERS);
  };

  const apply = () => {
    onApply(draft);
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
      <View className="flex-1 justify-end">
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
              {t('home.filters.title')}
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

          <ScrollView className="shrink" contentContainerClassName="gap-6 px-container-padding py-5">
            <FilterSection
              label={t('home.filters.time.label')}
              onSelect={(time) => setDraft((current) => ({ ...current, time }))}
              options={TIME_OPTIONS}
              selected={draft.time}
              translationPrefix="home.filters.time"
            />
            <FilterSection
              label={t('home.filters.price.label')}
              onSelect={(price) => setDraft((current) => ({ ...current, price }))}
              options={PRICE_OPTIONS}
              selected={draft.price}
              translationPrefix="home.filters.price"
            />
            <FilterSection
              label={t('home.filters.sort.label')}
              onSelect={(sort) => setDraft((current) => ({ ...current, sort }))}
              options={SORT_OPTIONS}
              selected={draft.sort}
              translationPrefix="home.filters.sort"
            />
          </ScrollView>

          <View className="flex-row gap-3 border-t border-outline-variant px-container-padding py-3">
            <Pressable
              accessibilityLabel={t('home.filters.reset')}
              accessibilityRole="button"
              className="h-cta-height flex-1 items-center justify-center rounded-ctl border border-primary active:opacity-80"
              onPress={reset}
            >
              <Text className="font-semibold text-body-md text-primary">
                {t('home.filters.reset')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t('home.filters.apply')}
              accessibilityRole="button"
              className="h-cta-height flex-1 items-center justify-center rounded-ctl bg-primary active:opacity-80"
              onPress={apply}
            >
              <Text className="font-semibold text-body-md text-on-primary">
                {t('home.filters.apply')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type FilterValue = TimeFilter | PriceFilter | SortOption;

type FilterSectionProps<TValue extends FilterValue> = {
  label: string;
  options: readonly TValue[];
  selected: TValue;
  translationPrefix: string;
  onSelect: (value: TValue) => void;
};

function FilterSection<TValue extends FilterValue>({
  label,
  onSelect,
  options,
  selected,
  translationPrefix,
}: FilterSectionProps<TValue>) {
  const { t } = useTranslation();

  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" className="gap-2">
      <Text className="font-semibold text-body-lg text-on-surface">{label}</Text>
      {options.map((option) => {
        const isSelected = option === selected;
        const optionLabel = t(`${translationPrefix}.${option}`);

        return (
          <Pressable
            key={option}
            accessibilityLabel={optionLabel}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            className={[
              'min-h-touch-target-min flex-row items-center gap-3 rounded-lg border px-4 py-2 active:bg-surface-container',
              isSelected
                ? 'border-primary bg-primary-container'
                : 'border-outline-variant bg-surface-container-lowest',
            ].join(' ')}
            onPress={() => onSelect(option)}
          >
            <View
              className={[
                'h-5 w-5 items-center justify-center rounded-full border',
                isSelected ? 'border-primary bg-primary' : 'border-outline',
              ].join(' ')}
            >
              {isSelected ? <MaterialIcons name="check" size={15} className="text-on-primary" /> : null}
            </View>
            <Text
              className={[
                'flex-1 font-medium text-body-md',
                isSelected ? 'text-on-primary-container' : 'text-on-surface',
              ].join(' ')}
            >
              {optionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
