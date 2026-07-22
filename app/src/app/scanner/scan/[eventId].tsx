import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { postCheckin, type CheckinResult } from '@/lib/api/checkin';
import { toUserMessage } from '@/lib/api/error-message';

// Green / amber / red — distinct at a glance for a gate operator. These are not
// theme roles (there is no success/warning token), so they are set inline.
const RESULT_COLOR: Record<CheckinResult, string> = {
  VALID: '#16a34a',
  ALREADY_USED: '#d97706',
  INVALID: '#dc2626',
  WRONG_EVENT: '#dc2626',
};

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  const [manual, setManual] = useState('');
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(true);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cameraSupported = Platform.OS !== 'web';

  // The camera fires onBarcodeScanned repeatedly while a code is in frame, and
  // every queued callback closes over the same render's `pending`. A synchronous
  // ref lock rejects the extra scans before any second POST is dispatched — the
  // state flag alone would let several through before the re-render.
  const lock = useRef(false);

  async function submit(qr: string) {
    const payload = qr.trim();
    if (!payload || lock.current) return;
    lock.current = true;
    setPending(true);
    setActive(false);
    setError(null);
    try {
      const res = await postCheckin(eventId, payload);
      setResult(res.result);
      setCount(res.checkedInCount);
    } catch (err) {
      setError(toUserMessage(err, t));
    } finally {
      setPending(false);
    }
  }

  function reset() {
    lock.current = false;
    setResult(null);
    setError(null);
    setManual('');
    setActive(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-container-padding py-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-content self-center gap-6">
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('scanner.back')}
                onPress={() => router.back()}
                className="active:opacity-60"
              >
                <MaterialIcons name="arrow-back" size={24} className="text-on-surface" />
              </Pressable>
              <Text className="flex-1 font-bold text-headline-md text-on-surface">
                {t('scanner.scanTitle')}
              </Text>
              {count !== null ? (
                <View className="rounded-full bg-surface-container px-3 py-1">
                  <Text className="font-semibold text-label-md text-on-surface">
                    {t('scanner.checkedIn', { count })}
                  </Text>
                </View>
              ) : null}
            </View>

            {result ? (
              <View
                className="items-center gap-2 rounded-lg px-4 py-6"
                style={{ backgroundColor: RESULT_COLOR[result] }}
              >
                <MaterialIcons
                  name={result === 'VALID' ? 'check-circle' : 'cancel'}
                  size={40}
                  color="#ffffff"
                />
                <Text className="font-bold text-headline-md text-white">
                  {t(`scanner.result.${result}`)}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="rounded-md bg-error-container px-4 py-3">
                <Text className="font-sans text-label-md text-on-error-container">
                  {error}
                </Text>
              </View>
            ) : null}

            {cameraSupported ? (
              permission?.granted ? (
                <View className="aspect-square overflow-hidden rounded-lg bg-surface-container">
                  {active && !pending ? (
                    <CameraView
                      style={{ flex: 1 }}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={({ data }) => void submit(data)}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      {pending ? (
                        <ActivityIndicator className="text-primary" />
                      ) : (
                        <MaterialIcons
                          name="qr-code-scanner"
                          size={48}
                          className="text-on-surface-variant"
                        />
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center gap-3 rounded-lg bg-surface-container px-4 py-8">
                  <Text className="text-center font-sans text-label-md text-on-surface-variant">
                    {t('scanner.cameraPermission')}
                  </Text>
                  <Button
                    icon="photo-camera"
                    label={t('scanner.grantCamera')}
                    onPress={() => void requestPermission()}
                  />
                </View>
              )
            ) : (
              <View className="rounded-md bg-surface-container px-4 py-3">
                <Text className="font-sans text-label-md text-on-surface-variant">
                  {t('scanner.cameraUnavailable')}
                </Text>
              </View>
            )}

            {result || error ? (
              <Button
                icon="refresh"
                label={t('scanner.scanNext')}
                onPress={reset}
              />
            ) : (
              <View className="gap-3">
                <TextField
                  label={t('scanner.manualLabel')}
                  placeholder={t('scanner.manualPlaceholder')}
                  value={manual}
                  onChangeText={setManual}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => void submit(manual)}
                  returnKeyType="go"
                />
                <Button
                  label={t('scanner.manualSubmit')}
                  loading={pending}
                  onPress={() => void submit(manual)}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
