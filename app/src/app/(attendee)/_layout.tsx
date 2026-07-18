import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@/stores/auth-store';

/** Matches the `md` breakpoint so the nav and the screens turn at the same width. */
const WIDE_BREAKPOINT = 768;

/** Mirrors `maxWidth.content` in tailwind.config.js, which the screens use. */
const CONTENT_WIDTH = 800;

type IconName = keyof typeof MaterialIcons.glyphMap;

/**
 * The pill behind the icon is the second channel for "you are here". Tint alone
 * would leave the current tab indistinguishable to anyone who cannot separate
 * teal from grey, which DESIGN.md rules out.
 *
 * It is sized by padding rather than a fixed width, because the label is below
 * the icon at phone width but beside it once the tabs move to the top, and the
 * navigator leaves only about 8px between the two. Any fixed width wide enough
 * to look right under a stacked label reaches under a beside-it label: a 64px
 * pill overlapped "Khám phá" by 11.5px.
 */
function TabIcon({
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
    <View className={`rounded-full p-1.5 ${focused ? 'bg-primary/10' : ''}`}>
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

/**
 * Attendee shell. Guarding here rather than on each screen means a tab added
 * later inherits the redirect without touching this file.
 *
 * Uses JS tabs rather than `expo-router/unstable-native-tabs`: native tabs are
 * alpha, and on web they fall back to a rough iPad-style bar. AC-19 puts web on
 * the same footing as the app, so that is not a trade this product can make.
 */
export default function AttendeeLayout() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);
  const { t } = useTranslation();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (isLoading) return null;
  if (!token) return <Redirect href="/auth/login" />;
  // Organizers own a separate area. Both route groups would otherwise resolve
  // "/" to their own index, so an organizer landing on the attendee root is
  // sent on to theirs.
  if (role === 'ORGANIZER') return <Redirect href="/organizer" />;

  // A bar pinned to the bottom of a 1440px desktop window is a phone habit, not
  // a layout. Past `md` the tabs move up top where a pointer expects them.
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'top' : 'bottom',
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens['on-surface-variant'],
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens['outline-variant'],
          borderBottomColor: tokens['outline-variant'],
          ...(isWide
            ? // Held to the same reading width as the screens below it. Spread
              // across a full desktop window the four tabs drift far apart and
              // stop lining up with the content they switch between.
              { height: 64, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center' }
            : { height: 80 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom }),
        },
        tabBarLabelStyle: {
          fontFamily: 'BeVietnamPro_500Medium',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: (props) => <TabIcon name="explore" {...props} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: t('tabs.tickets'),
          tabBarIcon: (props) => <TabIcon name="confirmation-number" {...props} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabs.notifications'),
          tabBarIcon: (props) => <TabIcon name="notifications" {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: (props) => <TabIcon name="person" {...props} />,
        }}
      />
    </Tabs>
  );
}
