import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/theme-store';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return preference === 'system' ? colorScheme : preference;
  }

  return 'light';
}
