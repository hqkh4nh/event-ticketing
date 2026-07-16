import { palette, type Palette } from '@/design/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Raw colour values for the few APIs that take a colour instead of a class
 * name. Prefer a NativeWind class: `cssInterop` already covers icons, so what
 * is left is React Navigation's theme, which is configured outside the tree.
 */
export function useTokens(): Palette {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
