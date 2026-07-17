import '@/global.css';
import '@/i18n';
import '@/design/css-interop';

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LaunchSplash } from '@/components/brand/launch-splash';
import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTokens } from '@/hooks/use-tokens';
import { queryClient } from '@/lib/query/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const tokens = useTokens();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateLanguage = useLanguageStore((state) => state.hydrate);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((state) => state.token);
  const [launchState, setLaunchState] = useState<'pending' | 'show' | 'complete'>(
    'pending',
  );

  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  // React Navigation is configured with values rather than classes, and its
  // stock themes carry their own palette. Feeding it our tokens stops screen
  // transitions from flashing a colour that exists nowhere in the design.
  const navigationTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: tokens.primary,
        background: tokens.surface,
        card: tokens['surface-container-lowest'],
        text: tokens['on-surface'],
        border: tokens['outline-variant'],
      },
    };
  }, [colorScheme, tokens]);

  useEffect(() => {
    void hydrateAuth();
    void hydrateLanguage();
  }, [hydrateAuth, hydrateLanguage]);

  useEffect(() => {
    if (
      (fontsLoaded || fontError) &&
      !isAuthLoading &&
      launchState === 'pending'
    ) {
      setLaunchState(token ? 'complete' : 'show');
    }
  }, [fontError, fontsLoaded, isAuthLoading, launchState, token]);

  useEffect(() => {
    if (
      (fontsLoaded || fontError) &&
      !isAuthLoading &&
      launchState !== 'pending'
    ) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, isAuthLoading, launchState]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          {/* Supplies every colour variable to the tree below. NativeWind
              resolves variables through context, so anything rendered outside
              this View, such as a portal, would see no theme at all. */}
          <View style={themes[colorScheme]} className="flex-1 bg-surface">
            {launchState === 'show' ? (
              <LaunchSplash onComplete={() => setLaunchState('complete')} />
            ) : launchState === 'complete' ? (
              <Stack screenOptions={{ headerShown: false }} />
            ) : null}
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
