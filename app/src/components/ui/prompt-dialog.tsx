import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  tone?: 'error' | 'primary';
  confirmDisabled?: boolean;
  children: ReactNode;
};

/**
 * ConfirmDialog with a form slot, for decisions that need typed input such as a
 * rejection reason, the reference of a transfer made by hand, or the reason an
 * event is being taken down.
 */
export function PromptDialog({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  icon = 'warning-amber',
  loading = false,
  tone = 'error',
  confirmDisabled = false,
  children,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isPrimary = tone === 'primary';
  const blocked = loading || confirmDisabled;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center px-container-padding">
        <Pressable
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          className="absolute inset-0 bg-black/60"
          disabled={loading}
          onPress={loading ? undefined : onCancel}
        />

        <View
          accessibilityViewIsModal
          className="w-full gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          style={[themes[colorScheme], { maxWidth: 420 }]}
        >
          <View className="items-center gap-4">
            <View
              className={[
                'h-14 w-14 items-center justify-center rounded-full',
                isPrimary ? 'bg-primary-container' : 'bg-error-container',
              ].join(' ')}
            >
              <MaterialIcons
                name={icon}
                size={28}
                className={
                  isPrimary
                    ? 'text-on-primary-container'
                    : 'text-on-error-container'
                }
              />
            </View>
            <View className="items-center gap-2">
              <Text className="text-center font-semibold text-headline-md text-on-surface">
                {title}
              </Text>
              <Text className="text-center font-sans text-body-md text-on-surface-variant">
                {description}
              </Text>
            </View>
          </View>

          <View className="gap-4">{children}</View>

          <View className="w-full flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              className={[
                'h-cta-height flex-1 items-center justify-center rounded-ctl border border-outline active:scale-[0.98] active:opacity-80',
                loading ? 'opacity-40' : '',
              ].join(' ')}
              disabled={loading}
              onPress={onCancel}
            >
              <Text className="font-semibold text-body-md text-on-surface">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: blocked }}
              className={[
                'h-cta-height flex-1 items-center justify-center rounded-ctl active:scale-[0.98] active:opacity-80',
                isPrimary ? 'bg-primary' : 'bg-error',
                blocked ? 'opacity-40' : '',
              ].join(' ')}
              disabled={blocked}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator
                  className={isPrimary ? 'text-on-primary' : 'text-on-error'}
                />
              ) : (
                <Text
                  className={[
                    'font-semibold text-body-md',
                    isPrimary ? 'text-on-primary' : 'text-on-error',
                  ].join(' ')}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
