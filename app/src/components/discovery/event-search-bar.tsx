import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

type EventSearchBarProps = {
  query: string;
  onChangeQuery: (query: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
};

export function EventSearchBar({
  query,
  onChangeQuery,
  onOpenFilters,
  activeFilterCount,
}: EventSearchBarProps) {
  const { t } = useTranslation();
  const tokens = useTokens();
  const hasQuery = query.length > 0;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <View className="flex-row items-center gap-2">
      <View className="h-touch-target-min min-w-0 flex-1 flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4">
        <MaterialIcons name="search" size={20} className="text-on-surface-variant" />
        <TextInput
          accessibilityLabel={t('home.searchPlaceholder')}
          className="h-full flex-1 py-0 font-sans text-body-md text-on-surface"
          onChangeText={onChangeQuery}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={tokens['on-surface-variant']}
          returnKeyType="search"
          textAlignVertical="center"
          value={query}
        />
        {hasQuery ? (
          <Pressable
            accessibilityLabel={t('home.clearSearch')}
            accessibilityRole="button"
            className="h-touch-target-min w-touch-target-min -mr-3 items-center justify-center rounded-full active:bg-surface-container"
            onPress={() => onChangeQuery('')}
          >
            <MaterialIcons name="close" size={20} className="text-on-surface-variant" />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityHint={
          hasActiveFilters ? t('home.activeFilterCount', { count: activeFilterCount }) : undefined
        }
        accessibilityLabel={t('home.openFilters')}
        accessibilityRole="button"
        accessibilityState={{ selected: hasActiveFilters }}
        className="relative h-touch-target-min w-touch-target-min items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest active:bg-surface-container"
        onPress={onOpenFilters}
      >
        <MaterialIcons name="tune" size={21} className="text-on-surface" />
        {hasActiveFilters ? (
          <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-primary px-1">
            <Text className="font-semibold text-label-sm text-on-primary">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
