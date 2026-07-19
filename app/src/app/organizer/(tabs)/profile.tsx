import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import type { Language } from '@/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';

const LANGUAGES: Language[] = ['vi', 'en'];

export default function OrganizerAccountScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="border-b border-outline-variant px-container-padding py-4">
          <Text className="font-bold text-display-sm text-on-surface">
            {t('organizer.account.title')}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-6 px-container-padding py-6"
        >
          <View className="gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <Text className="font-semibold text-body-md text-on-surface">
              {user?.fullName}
            </Text>
            <Text className="font-sans text-label-md text-on-surface-variant">
              {user?.email}
            </Text>
            <Text className="pt-2 font-medium text-label-sm text-primary">
              {t('organizer.account.role')}
            </Text>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.account.language')}
            </Text>
            <View
              accessibilityRole="radiogroup"
              className="h-touch-target-min flex-row rounded-lg bg-surface-container p-1"
            >
              {LANGUAGES.map((value) => {
                const selected = value === language;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => void setLanguage(value)}
                    className={[
                      'flex-1 items-center justify-center rounded active:opacity-70',
                      selected ? 'bg-surface-container-lowest' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Text
                      className={[
                        'font-medium text-label-md',
                        selected ? 'text-primary' : 'text-on-surface-variant',
                      ].join(' ')}
                    >
                      {t(`organizer.account.languages.${value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="border-t border-outline-variant pt-6">
            <Button
              icon="logout"
              variant="outline"
              label={t('profile.signOut')}
              onPress={() => void signOut()}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
