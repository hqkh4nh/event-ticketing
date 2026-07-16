import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  action?: React.ReactNode;
};

/** Empty state for a tab whose feature is not built yet. */
export function PlaceholderScreen({ icon, title, description, action }: Props) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="flex-1 justify-center">
        <EmptyState icon={icon} title={title} description={description} action={action} />
      </View>
    </SafeAreaView>
  );
}
