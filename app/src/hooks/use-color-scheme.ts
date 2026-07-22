import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/theme-store';

export function useColorScheme() {
  const systemColorScheme = useSystemColorScheme();
  const preference = useThemeStore((state) => state.preference);

  return preference === 'system' ? systemColorScheme : preference;
}
