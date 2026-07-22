import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Language } from '@/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { type ThemePreference, useThemeStore } from '@/stores/theme-store';

const LANGUAGES: Language[] = ['vi', 'en'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const APP_VERSION = '1.0.0';

type AccountRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description?: string;
  last?: boolean;
  onPress: () => void;
};

function AccountRow({ icon, label, description, last = false, onPress }: AccountRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={[
        'min-h-touch-target-min flex-row items-center gap-3 px-4 py-3 active:bg-surface-container-low',
        last ? '' : 'border-b border-outline-variant',
      ].join(' ')}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
        <MaterialIcons name={icon} size={21} className="text-on-primary-container" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-medium text-body-md text-on-surface">{label}</Text>
        {description ? (
          <Text numberOfLines={1} className="font-sans text-label-sm text-on-surface-variant">
            {description}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} className="text-outline" />
    </Pressable>
  );
}

function initialsOf(fullName?: string): string {
  if (!fullName) return 'OR';

  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function OrganizerAccountScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const theme = useThemeStore((state) => state.preference);
  const setTheme = useThemeStore((state) => state.setPreference);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);

  function showComingSoon() {
    Alert.alert(
      t('organizer.account.comingSoonTitle'),
      t('organizer.account.comingSoonDescription'),
    );
  }

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
          <View className="flex-row items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-container">
              <Text className="font-bold text-headline-md text-on-primary-container">
                {initialsOf(user?.fullName)}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text numberOfLines={1} className="font-semibold text-body-lg text-on-surface">
                {user?.fullName}
              </Text>
              <Text numberOfLines={1} className="font-sans text-label-md text-on-surface-variant">
                {user?.email}
              </Text>
              <View className="self-start rounded-full bg-primary-container px-3 py-1">
                <Text className="font-medium text-label-sm text-on-primary-container">
                  {t('organizer.account.role')}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.account.accountSection')}
            </Text>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <AccountRow
                icon="person-outline"
                label={t('organizer.account.editProfile')}
                description={t('organizer.account.editProfileDescription')}
                onPress={showComingSoon}
              />
              <AccountRow
                icon="business"
                label={t('organizer.account.organization')}
                description={t('organizer.account.organizationDescription')}
                onPress={showComingSoon}
              />
              <AccountRow
                icon="security"
                label={t('organizer.account.security')}
                description={t('organizer.account.securityDescription')}
                last
                onPress={showComingSoon}
              />
            </View>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.account.preferences')}
            </Text>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <View className="gap-3 p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-container">
                    <MaterialIcons
                      name="language"
                      size={20}
                      className="text-on-primary-container"
                    />
                  </View>
                  <Text className="font-medium text-body-md text-on-surface">
                    {t('organizer.account.language')}
                  </Text>
                </View>
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

              <View className="gap-3 border-t border-outline-variant p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-container">
                    <MaterialIcons
                      name="palette"
                      size={20}
                      className="text-on-primary-container"
                    />
                  </View>
                  <Text className="font-medium text-body-md text-on-surface">
                    {t('organizer.account.theme')}
                  </Text>
                </View>
                <View
                  accessibilityRole="radiogroup"
                  className="h-touch-target-min flex-row rounded-lg bg-surface-container p-1"
                >
                  {THEMES.map((value) => {
                    const selected = value === theme;

                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => void setTheme(value)}
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
                          {t(`organizer.account.themes.${value}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('organizer.account.supportSection')}
            </Text>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <AccountRow
                icon="help-outline"
                label={t('organizer.account.helpCenter')}
                onPress={showComingSoon}
              />
              <AccountRow
                icon="description"
                label={t('organizer.account.terms')}
                onPress={showComingSoon}
              />
              <AccountRow
                icon="privacy-tip"
                label={t('organizer.account.privacy')}
                onPress={showComingSoon}
              />
              <AccountRow
                icon="star-outline"
                label={t('organizer.account.rateApp')}
                last
                onPress={showComingSoon}
              />
            </View>
          </View>

          <View className="border-t border-outline-variant pt-6">
            <Button
              icon="logout"
              variant="outline"
              label={t('profile.signOut')}
              onPress={() => setSignOutDialogVisible(true)}
            />
          </View>

          <Text className="pb-2 text-center font-sans text-label-sm text-on-surface-variant">
            {t('organizer.account.version', { version: APP_VERSION })}
          </Text>
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={signOutDialogVisible}
        icon="logout"
        title={t('profile.signOutConfirmTitle')}
        description={t('profile.signOutConfirmDescription')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('profile.signOut')}
        onCancel={() => setSignOutDialogVisible(false)}
        onConfirm={() => {
          setSignOutDialogVisible(false);
          void signOut();
        }}
      />
    </SafeAreaView>
  );
}
