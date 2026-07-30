import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type DiscoverySectionProps = {
  title: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onPressAction?: () => void;
  children: ReactNode;
};

/** Groups a discovery feed with an optional, intentionally explicit action. */
export function DiscoverySection({
  title,
  actionLabel,
  actionAccessibilityLabel,
  onPressAction,
  children,
}: DiscoverySectionProps) {
  const canPressAction = Boolean(actionLabel && onPressAction);

  return (
    <View className="gap-3">
      <View className="min-h-touch-target-min flex-row items-center justify-between gap-3">
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          className="min-w-0 flex-1 font-semibold text-headline-md text-on-surface"
        >
          {title}
        </Text>

        {canPressAction ? (
          <Pressable
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            accessibilityRole="button"
            className="h-touch-target-min max-w-[45%] shrink-0 items-center justify-center rounded-full px-2 active:bg-surface-container"
            onPress={onPressAction}
          >
            <Text numberOfLines={1} className="w-full font-semibold text-label-md text-primary">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {children}
    </View>
  );
}
