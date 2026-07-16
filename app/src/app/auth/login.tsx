import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/logo-mark';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { login } from '@/lib/api/auth';
import { toFieldErrors, toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = t('auth.error.emailRequired');
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('auth.error.emailInvalid');
    if (!password) next.password = t('auth.error.passwordRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      await signIn(res.accessToken, res.user);
      router.replace('/');
    } catch (err) {
      setFormError(toUserMessage(err, t));
      // A VALIDATION_FAILED here means a rule the client check missed.
      // Surface it on the field rather than only in the banner.
      setErrors((prev) => ({ ...prev, ...toFieldErrors(err, t) }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
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
              <LogoMark size={64} />
              <View className="items-center gap-1">
                <Text className="font-bold text-display-sm text-on-surface">
                  {t('auth.login.title')}
                </Text>
                <Text className="font-sans text-body-md text-on-surface-variant">
                  {t('auth.login.subtitle')}
                </Text>
              </View>
            </View>

            <View className="gap-4">
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
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />

              {formError ? (
                <View className="rounded-md bg-error-container px-4 py-3">
                  <Text className="font-sans text-label-md text-on-error-container">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <Button label={t('auth.login.submit')} loading={loading} onPress={onSubmit} />
            </View>

            <View className="gap-3">
              <View className="flex-row items-center gap-4">
                <View className="h-px flex-1 bg-outline-variant" />
                {/* `outline` is a border role. As text on `surface` it lands at
                    4.26:1, under AA, so the divider label uses the text role. */}
                <Text className="font-sans text-label-sm uppercase text-on-surface-variant">
                  {t('auth.social.divider')}
                </Text>
                <View className="h-px flex-1 bg-outline-variant" />
              </View>

              {/* OAuth is not wired up yet. The button stays disabled rather than
                  rendering as tappable and doing nothing when pressed. */}
              <Button
                variant="outline"
                label={`${t('auth.social.google')} (${t('auth.social.comingSoon')})`}
                disabled
                onPress={() => {}}
              />
            </View>

            <View className="flex-row justify-center gap-1">
              <Text className="font-sans text-body-md text-on-surface-variant">
                {t('auth.login.noAccount')}
              </Text>
              <Link href="/auth/register" className="font-semibold text-body-md text-primary">
                {t('auth.login.goRegister')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
