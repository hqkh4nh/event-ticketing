import { MaterialIcons } from '@expo/vector-icons';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '@/hooks/use-tokens';

const WIDE_BREAKPOINT = 768;
const CONTENT_WIDTH = 800;

type IconName = keyof typeof MaterialIcons.glyphMap;

export function AppTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: IconName;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View
      className={`h-8 w-8 items-center justify-center rounded-full ${focused ? 'bg-primary/10' : ''}`}
    >
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

/** Shared tab behavior for role shells: bottom on phones, top at desktop width. */
export function useAppTabScreenOptions() {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return {
    headerShown: false,
    tabBarPosition: isWide ? ('top' as const) : ('bottom' as const),
    tabBarActiveTintColor: tokens.primary,
    tabBarInactiveTintColor: tokens['on-surface-variant'],
    tabBarStyle: {
      backgroundColor: tokens.surface,
      borderTopColor: tokens['outline-variant'],
      borderBottomColor: tokens['outline-variant'],
      ...(isWide
        ? {
            height: 64,
            width: '100%' as const,
            maxWidth: CONTENT_WIDTH,
            alignSelf: 'center' as const,
          }
        : {
            height: 80 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom,
          }),
    },
    tabBarLabelStyle: {
      fontFamily: 'BeVietnamPro_500Medium',
      fontSize: 12,
    },
    tabBarIconStyle: {
      width: 32,
      height: 32,
    },
  };
}
