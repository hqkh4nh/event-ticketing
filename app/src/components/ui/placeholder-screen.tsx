import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTokens } from '@/hooks/use-tokens';

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
};

/** Empty state for a tab whose feature is not built yet. */
export function PlaceholderScreen({ icon, title, description }: Props) {
  const tokens = useTokens();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface dark:bg-d-surface">
      <View className="flex-1 items-center justify-center gap-3 px-container-padding">
        <MaterialIcons name={icon} size={48} color={tokens.outlineVariant} />

        <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
          {title}
        </Text>

        <Text className="text-center font-sans text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}
