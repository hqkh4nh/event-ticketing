import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { login } from "@/lib/api/auth";
import { toFieldErrors, toUserMessage } from "@/lib/api/error-message";
import { useAuthStore } from "@/stores/auth-store";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const scheme = useColorScheme();
    const signIn = useAuthStore((s) => s.signIn);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function validate() {
        const next: typeof errors = {};
        if (!email.trim()) next.email = t('auth.error.emailRequired');
        else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
            next.email = t('auth.error.emailInvalid');
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
                size={64}
                color={scheme === 'dark' ? '#4fdbc8' : '#006b5f'}
              />
              <View className="items-center gap-1">
                <Text className="font-bold text-[24px] leading-8 tracking-tight text-on-surface dark:text-d-on-surface">
                  {t('auth.login.title')}
                </Text>
                <Text className="font-sans text-[16px] leading-6 text-on-surface-variant dark:text-d-on-surface-variant">
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
                  <Text className="font-sans text-[14px] leading-5 text-on-error-container">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <Button
                label={t('auth.login.submit')}
                loading={loading}
                onPress={onSubmit}
              />
            </View>

            <View className="gap-3">
              <View className="flex-row items-center gap-4">
                <View className="h-px flex-1 bg-outline-variant dark:bg-d-outline-variant" />
                <Text className="font-sans text-[12px] uppercase tracking-widest text-outline dark:text-d-outline">
                  {t('auth.social.divider')}
                </Text>
                <View className="h-px flex-1 bg-outline-variant dark:bg-d-outline-variant" />
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
              <Text className="font-sans text-[16px] leading-6 text-on-surface-variant dark:text-d-on-surface-variant">
                {t('auth.login.noAccount')}
              </Text>
              <Link
                href="/auth/register"
                className="font-semibold text-[16px] leading-6 text-primary dark:text-d-primary"
              >
                {t('auth.login.goRegister')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    )
}
