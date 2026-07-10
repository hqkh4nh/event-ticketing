import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import i18n, {
  getDeviceLanguage,
  type Language,
} from '@/i18n';

const LANGUAGE_STORAGE_KEY = 'app_language';

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'vi';
}

type LanguageState = {
  language: Language;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getDeviceLanguage(),
  isLoading: true,

  async hydrate() {
    let language = getDeviceLanguage();

    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(storedLanguage)) language = storedLanguage;
    } catch {
      // Fall back to the device locale when persisted preferences are unavailable.
    }

    await i18n.changeLanguage(language);
    set({ language, isLoading: false });
  },

  async setLanguage(language) {
    await i18n.changeLanguage(language);
    set({ language });
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  },
}));
