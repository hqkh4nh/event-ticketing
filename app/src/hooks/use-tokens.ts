import { useColorScheme } from 'react-native';

import { tokens, type Tokens } from '@/constants/tokens';

/**
 * Design tokens for the active colour scheme. Reach for this only where a
 * NativeWind class will not work, such as icon and navigator colours.
 */
export function useTokens(): Tokens {
  return useColorScheme() === 'dark' ? tokens.dark : tokens.light;
}
