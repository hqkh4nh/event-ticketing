import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { NumericText } from '@/components/ui/numeric-text';
import type { OrderResponse } from '@/lib/api/orders';
import { formatCountdown, formatDateTime, formatVndAmount } from '@/lib/format';

type PendingOrderCardProps = {
  order: OrderResponse;
  remainingMs: number;
  onContinue: () => void;
};

export function PendingOrderCard({
  order,
  remainingMs,
  onContinue,
}: PendingOrderCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <View className="h-64 justify-between rounded-xl border border-warning/40 bg-surface-container-lowest p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2 rounded-full bg-warning-container px-3 py-1">
          <MaterialIcons
            name="schedule"
            size={16}
            className="text-on-warning-container"
          />
          <Text className="font-medium text-label-sm text-on-warning-container">
            {t('tickets.pending.status')}
          </Text>
        </View>
        <NumericText className="font-semibold text-body-md text-warning">
          {formatCountdown(remainingMs)}
        </NumericText>
      </View>

      <View className="min-h-12 justify-center gap-1">
        <Text
          numberOfLines={2}
          className="font-semibold text-body-lg text-on-surface"
        >
          {order.event.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="event" size={17} className="text-primary" />
          <Text className="font-sans text-label-md text-on-surface-variant">
            {formatDateTime(order.event.startAt, i18n.language)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3 border-t border-outline-variant pt-3">
        <Text className="font-sans text-label-md text-on-surface-variant">
          {t('tickets.pending.amount')}
        </Text>
        <NumericText className="font-bold text-body-lg text-primary">
          {t('event.price', {
            price: formatVndAmount(order.totalVnd, i18n.language),
          })}
        </NumericText>
      </View>

      <Button
        icon="qr-code-2"
        label={t('tickets.pending.continuePayment')}
        onPress={onContinue}
      />
    </View>
  );
}
