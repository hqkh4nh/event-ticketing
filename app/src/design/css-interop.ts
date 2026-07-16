import { MaterialIcons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { ActivityIndicator } from 'react-native';

/**
 * These components take a `color` prop rather than a style, so a class name
 * means nothing to them until the style is unwrapped back onto that prop.
 * Registering them lets a caller write `className="text-primary"` and follow
 * the active theme like every other element, instead of reaching for a raw
 * token and hardcoding a value that cannot respond to dark mode.
 *
 * Imported for its side effect from the root layout, before anything renders.
 */
const colorFromClassName = {
  className: {
    target: 'style',
    nativeStyleToProp: { color: true },
  },
} as const;

cssInterop(MaterialIcons, colorFromClassName);
cssInterop(ActivityIndicator, colorFromClassName);
