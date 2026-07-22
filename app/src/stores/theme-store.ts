import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const THEME_STORAGE_KEY = 'app_theme';

export type ThemePreference = 'system' | 'light' | 'dark';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

type ThemeState = {
  preference: ThemePreference;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  isLoading: true,

  async hydrate() {
    let preference: ThemePreference = 'system';

    try {
      const storedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(storedPreference)) preference = storedPreference;
    } catch {
      // Fall back to the system theme when persisted preferences are unavailable.
    }

    set({ preference, isLoading: false });
  },

  async setPreference(preference) {
    set({ preference });
    await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  },
}));
