import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';

const PAYMENT_STEPS = [
  { id: 'createOrder', icon: 'shopping-bag' },
  { id: 'scanQr', icon: 'qr-code-2' },
  { id: 'confirmation', icon: 'verified' },
] as const satisfies readonly {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[];

const PAYMENT_NOTES = ['exactAmount', 'expiresAt', 'bankSecurity'] as const;

export default function PaymentInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <DetailScreenShell
      title={t('paymentInfo.title')}
      description={t('paymentInfo.description')}
    >
      <View className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-container">
            <MaterialIcons
              name="account-balance"
              size={24}
              className="text-on-primary-container"
            />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="self-start rounded-full bg-primary-container px-2.5 py-1">
              <Text className="font-medium text-label-sm text-on-primary-container">
                {t('paymentInfo.available')}
              </Text>
            </View>
            <Text className="font-semibold text-body-lg text-on-surface">
              {t('paymentInfo.vietQr')}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-body-md leading-6 text-on-surface-variant">
          {t('paymentInfo.vietQrDescription')}
        </Text>
      </View>

      <View className="gap-3">
        <Text className="font-semibold text-headline-md text-on-surface">
          {t('paymentInfo.howToTitle')}
        </Text>
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {PAYMENT_STEPS.map((step, index) => (
            <View
              key={step.id}
              className={[
                'flex-row items-start gap-3 p-4',
                index === PAYMENT_STEPS.length - 1
                  ? ''
                  : 'border-b border-outline-variant',
              ].join(' ')}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                <MaterialIcons
                  name={step.icon}
                  size={21}
                  className="text-on-surface-variant"
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-semibold text-body-md text-on-surface">
                  {t(`paymentInfo.steps.${step.id}.title`)}
                </Text>
                <Text className="font-sans text-label-md leading-5 text-on-surface-variant">
                  {t(`paymentInfo.steps.${step.id}.description`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3 rounded-xl bg-surface-container p-4">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="info-outline" size={21} className="text-primary" />
          <Text className="font-semibold text-body-md text-on-surface">
            {t('paymentInfo.notesTitle')}
          </Text>
        </View>
        {PAYMENT_NOTES.map((note) => (
          <View key={note} className="flex-row items-start gap-2">
            <MaterialIcons name="check-circle" size={18} className="mt-0.5 text-primary" />
            <Text className="min-w-0 flex-1 font-sans text-label-md leading-5 text-on-surface-variant">
              {t(`paymentInfo.notes.${note}`)}
            </Text>
          </View>
        ))}
      </View>

      <Button
        icon="confirmation-number"
        label={t('paymentInfo.openPendingOrders')}
        onPress={() => router.push('/(attendee)/tickets')}
      />
    </DetailScreenShell>
  );
}
