import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  icon = 'warning-amber',
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center px-container-padding">
        <Pressable
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          className="absolute inset-0 bg-black/60"
          onPress={onCancel}
        />

        <View
          accessibilityViewIsModal
          className="w-full items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          style={[themes[colorScheme], { maxWidth: 420 }]}
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-error-container">
            <MaterialIcons name={icon} size={28} className="text-on-error-container" />
          </View>

          <View className="items-center gap-2">
            <Text className="text-center font-semibold text-headline-md text-on-surface">
              {title}
            </Text>
            <Text className="text-center font-sans text-body-md text-on-surface-variant">
              {description}
            </Text>
          </View>

          <View className="mt-2 w-full flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="h-cta-height flex-1 items-center justify-center rounded-full border border-outline active:scale-[0.98] active:opacity-80"
              onPress={onCancel}
            >
              <Text className="font-semibold text-body-md text-on-surface">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="h-cta-height flex-1 items-center justify-center rounded-full bg-error active:scale-[0.98] active:opacity-80"
              onPress={onConfirm}
            >
              <Text className="font-semibold text-body-md text-on-error">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
