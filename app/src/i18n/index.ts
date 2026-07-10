import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@/i18n/locales/en';
import { vi } from '@/i18n/locales/vi';

export const supportedLanguages = ['en', 'vi'] as const;
export type Language = (typeof supportedLanguages)[number];

export function getDeviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'vi' ? 'vi' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
