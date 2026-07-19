import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketQr } from '@/components/ticket/ticket-qr';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getOrder, ordersKeys } from '@/lib/api/orders';
import { toUserMessage } from '@/lib/api/error-message';
import { formatDateTime } from '@/lib/format';

export default function OrderConfirmationScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const orderQuery = useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: orderId.length > 0,
  });
  const order = orderQuery.data;

  if (orderQuery.isPending && orderId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator className="text-primary" />
      </View>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="cloud-off"
          title={t('order.loadErrorTitle')}
          description={toUserMessage(orderQuery.error, t)}
          action={
            <Button label={t('tickets.emptyAction')} onPress={() => router.replace('/')} />
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="w-full max-w-content flex-1 self-center"
        contentContainerClassName="px-container-padding gap-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MaterialIcons name="check-circle" size={40} className="text-primary" />
          </View>
          <Text className="text-center font-bold text-headline-md text-on-surface">
            {t('order.confirmedTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-on-surface-variant">
            {t('order.confirmedBody')}
          </Text>
        </View>

        <View className="gap-1 rounded-lg bg-surface-container-low p-4">
          <Text className="font-semibold text-body-lg text-on-surface">{order.event.title}</Text>
          <Text className="font-sans text-label-md text-on-surface-variant">
            {formatDateTime(order.event.startAt, i18n.language)}
          </Text>
          <Text className="font-sans text-label-md text-on-surface-variant">
            {order.event.venue}
          </Text>
        </View>

        <View className="gap-4">
          <Text className="font-semibold text-headline-md text-on-surface">
            {t('order.yourTickets', { count: order.tickets.length })}
          </Text>
          {order.tickets.map((ticket) => (
            <View
              key={ticket.id}
              className="items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              <Text className="font-semibold text-body-lg text-on-surface">
                {ticket.ticketTypeName}
              </Text>
              <TicketQr value={ticket.qrPayload} />
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {ticket.code}
              </Text>
            </View>
          ))}
        </View>

        <View className="gap-3">
          <Button label={t('order.viewTickets')} onPress={() => router.replace('/tickets')} />
          <Button
            variant="outline"
            label={t('order.backHome')}
            onPress={() => router.replace('/')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
