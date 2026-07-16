import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  /** A way out. DESIGN.md asks an empty state to show how to fill itself. */
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View className="items-center gap-3 px-container-padding py-12">
      <MaterialIcons name={icon} size={40} className="text-outline-variant" />

      <Text className="font-semibold text-headline-md text-on-surface">{title}</Text>

      <Text className="max-w-content text-center font-sans text-label-md text-on-surface-variant">
        {description}
      </Text>

      {action ? <View className="pt-2">{action}</View> : null}
    </View>
  );
}
