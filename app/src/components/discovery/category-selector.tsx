import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text } from 'react-native';

import type { CategoryFilter } from '@/lib/discovery';

type CategorySelectorProps = {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
};

const CATEGORIES: readonly CategoryFilter[] = [
  'ALL',
  'MUSIC',
  'TECH',
  'ART',
  'SPORT',
  'WORKSHOP',
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-container-padding"
    >
      {CATEGORIES.map((category) => {
        const selected = category === value;
        const label =
          category === 'ALL' ? t('home.allCategories') : t(`event.category.${category}`);

        return (
          <Pressable
            key={category}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={[
              'h-touch-target-min items-center justify-center rounded-full border px-4 active:opacity-80',
              selected
                ? 'border-primary bg-primary'
                : 'border-outline-variant bg-surface-container-lowest active:bg-surface-container',
            ].join(' ')}
            onPress={() => onChange(category)}
          >
            <Text
              className={[
                'font-semibold text-label-md',
                selected ? 'text-on-primary' : 'text-on-surface-variant',
              ].join(' ')}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
