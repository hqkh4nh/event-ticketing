import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/logo-mark';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { staffConnect } from '@/lib/api/auth';
import { toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

export default function StaffConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [permission, requestPermission] = useCameraPermissions();

  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cameraSupported = Platform.OS !== 'web';

  // The camera fires onBarcodeScanned repeatedly while the QR stays in frame;
  // a synchronous ref lock keeps a single connect request in flight.
  const lock = useRef(false);

  async function submit(raw: string) {
    const value = raw.trim().toUpperCase();
    if (!value || lock.current) return;
    lock.current = true;
    setFormError(null);
    setLoading(true);
    setScanning(false);
    try {
      const res = await staffConnect({ code: value });
      await signIn(res.accessToken, res.user);
      router.replace('/');
    } catch (err) {
      setFormError(toUserMessage(err, t));
      lock.current = false;
    } finally {
      setLoading(false);
    }
  }

  async function toggleScan() {
    if (scanning) {
      setScanning(false);
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanning(true);
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
                  {t('auth.staffConnect.title')}
                </Text>
                <Text className="text-center font-sans text-body-md text-on-surface-variant">
                  {t('auth.staffConnect.subtitle')}
                </Text>
              </View>
            </View>

            <View className="gap-4">
              <TextField
                label={t('auth.staffConnect.codeLabel')}
                placeholder={t('auth.staffConnect.codePlaceholder')}
                value={code}
                onChangeText={(value) => setCode(value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={16}
                onSubmitEditing={() => void submit(code)}
                returnKeyType="go"
              />

              {formError ? (
                <View className="rounded-md bg-error-container px-4 py-3">
                  <Text className="font-sans text-label-md text-on-error-container">
                    {formError}
                  </Text>
                </View>
              ) : null}

              <Button
                label={t('auth.staffConnect.submit')}
                loading={loading}
                onPress={() => void submit(code)}
              />

              {cameraSupported ? (
                <Button
                  variant="outline"
                  icon={scanning ? 'close' : 'qr-code-scanner'}
                  label={
                    scanning
                      ? t('auth.staffConnect.stopScan')
                      : t('auth.staffConnect.scanQr')
                  }
                  onPress={() => void toggleScan()}
                />
              ) : null}

              {scanning ? (
                <View className="aspect-square overflow-hidden rounded-lg bg-surface-container">
                  <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => void submit(data)}
                  />
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center justify-center gap-1">
              <MaterialIcons
                name="arrow-back"
                size={16}
                className="text-primary"
              />
              <Link
                href="/auth/login"
                className="font-semibold text-body-md text-primary"
              >
                {t('auth.staffConnect.backToLogin')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
