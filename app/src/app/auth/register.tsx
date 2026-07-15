import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/logo-mark';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { register } from '@/lib/api/auth';
import { toFieldErrors, toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

type SignupRole = 'ATTENDEE' | 'ORGANIZER';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme();
  const signIn = useAuthStore((s) => s.signIn);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRole>('ATTENDEE');
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = t('auth.error.fullNameRequired');
    if (!email.trim()) next.email = t('auth.error.emailRequired');
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      next.email = t('auth.error.emailInvalid');
    if (!password) next.password = t('auth.error.passwordRequired');
    else if (password.length < 8) next.password = t('auth.error.passwordShort');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      });
      await signIn(res.accessToken, res.user);
      router.replace('/');
    } catch (err) {
      setFormError(toUserMessage(err, t));
      setErrors((prev) => ({ ...prev, ...toFieldErrors(err, t) }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-d-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-container-padding py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md self-center gap-8">
            <View className="items-center gap-4">
              <LogoMark
                size={56}
                color={scheme === 'dark' ? '#4fdbc8' : '#006b5f'}
              />
              <View className="items-center gap-1">
                <Text className="font-bold text-[24px] leading-8 tracking-tight text-on-surface dark:text-d-on-surface">
                  {t('auth.register.title')}
                </Text>
                <Text className="font-sans text-[16px] leading-6 text-on-surface-variant dark:text-d-on-surface-variant">
                  {t('auth.register.subtitle')}
                </Text>
              </View>
            </View>

            <View className="gap-4">
              <TextField
                label={t('auth.field.fullName')}
                placeholder={t('auth.field.fullNamePlaceholder')}
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                autoComplete="name"
                textContentType="name"
              />

              <TextField
                label={t('auth.field.email')}
                placeholder={t('auth.field.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              <TextField
                label={t('auth.field.password')}
                placeholder={t('auth.field.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />

              {/* Only ATTENDEE and ORGANIZER are offered. SCANNER is assigned
                  by an organizer, and ADMIN comes from the seed script. */}
              <View className="gap-2">
                <Text className="font-medium text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
                  {t('auth.register.roleLabel')}
                </Text>
                <View className="flex-row gap-3">
                  {(
                    [
                      ['ATTENDEE', t('auth.register.roleAttendee')],
                      ['ORGANIZER', t('auth.register.roleOrganizer')],
                    ] as const
                  ).map(([value, label]) => {
                    const selected = role === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setRole(value)}
                        className={[
                          'h-touch-target-min flex-1 items-center justify-center rounded-md border',
                          selected
                            ? 'border-primary bg-primary-container dark:border-d-primary'
                            : 'border-outline dark:border-d-outline',
                        ].join(' ')}
                      >
                        <Text
                          className={[
                            'font-medium text-[14px] leading-5',
                            selected
                              ? 'text-on-primary-container'
                              : 'text-on-surface-variant dark:text-d-on-surface-variant',
                          ].join(' ')}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* AC-17: warn up front, so the approval wait is not a
                    surprise the first time an action is blocked. */}
                {role === 'ORGANIZER' ? (
                  <View className="rounded-md bg-warning-container px-4 py-3">
                    <Text className="font-sans text-[14px] leading-5 text-on-warning-container">
                      {t('auth.register.organizerNotice')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {formError ? (
                <View className="rounded-md bg-error-container px-4 py-3">
                  <Text className="font-sans text-[14px] leading-5 text-on-error-container">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <Button
                label={t('auth.register.submit')}
                loading={loading}
                onPress={onSubmit}
              />
            </View>

            <View className="flex-row justify-center gap-1">
              <Text className="font-sans text-[16px] leading-6 text-on-surface-variant dark:text-d-on-surface-variant">
                {t('auth.register.hasAccount')}
              </Text>
              <Link
                href="/auth/login"
                className="font-semibold text-[16px] leading-6 text-primary dark:text-d-primary"
              >
                {t('auth.register.goLogin')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}