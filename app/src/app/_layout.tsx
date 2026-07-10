import '@/global.css';
import '@/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateLanguage = useLanguageStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateAuth();
    void hydrateLanguage();
  }, [hydrateAuth, hydrateLanguage]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
