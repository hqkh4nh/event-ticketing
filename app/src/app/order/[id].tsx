import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketQr } from '@/components/ticket/ticket-qr';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NumericText } from '@/components/ui/numeric-text';
import { getOrder, ordersKeys, type OrderResponse } from '@/lib/api/orders';
import { toUserMessage } from '@/lib/api/error-message';
import { formatDateTime, formatVndAmount } from '@/lib/format';

/** Formats a millisecond span as mm:ss, clamped at zero. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function OrderScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const orderQuery = useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: orderId.length > 0,
    // Poll while awaiting payment so the screen flips to tickets on its own.
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 4000 : false,
    // Keep polling even when the tab is backgrounded (the buyer is in their
    // banking app), otherwise the flip to PAID only lands on window refocus.
    refetchIntervalInBackground: true,
  });
  const order = orderQuery.data;

  // Tick once a second to drive the payment countdown.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (order?.status !== 'PENDING') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);

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

  const remainingMs = order.payment
    ? new Date(order.payment.expiresAt).getTime() - now
    : 0;
  const isExpired =
    order.status === 'EXPIRED' ||
    order.status === 'CANCELLED' ||
    (order.status === 'PENDING' && remainingMs <= 0);

  const body =
    order.status === 'PENDING' && !isExpired ? (
      <PendingPayment order={order} remainingMs={remainingMs} />
    ) : isExpired ? (
      <ExpiredOrder eventId={order.event.id} />
    ) : (
      <PaidOrder order={order} />
    );

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="w-full max-w-content flex-1 self-center"
        contentContainerClassName="px-container-padding gap-6"
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <EventSummary order={order} />
        {body}
      </ScrollView>
    </View>
  );
}

function EventSummary({ order }: { order: OrderResponse }) {
  const { i18n } = useTranslation();
  return (
    <View className="gap-1 rounded-lg bg-surface-container-low p-4">
      <Text className="font-semibold text-body-lg text-on-surface">{order.event.title}</Text>
      <Text className="font-sans text-label-md text-on-surface-variant">
        {formatDateTime(order.event.startAt, i18n.language)}
      </Text>
      <Text className="font-sans text-label-md text-on-surface-variant">{order.event.venue}</Text>
    </View>
  );
}

function PendingPayment({
  order,
  remainingMs,
}: {
  order: OrderResponse;
  remainingMs: number;
}) {
  const { t, i18n } = useTranslation();
  const payment = order.payment;
  if (!payment) return null;

  return (
    <View className="gap-4">
      <View className="items-center gap-2">
        <Text className="text-center font-bold text-headline-md text-on-surface">
          {t('order.payTitle')}
        </Text>
        <Text className="text-center font-sans text-body-md text-on-surface-variant">
          {t('order.payBody')}
        </Text>
      </View>

      <View className="items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-5">
        <Image
          source={payment.qrImageUrl}
          contentFit="contain"
          style={{ width: 240, height: 240 }}
        />
        <View className="items-center gap-1">
          <Text className="font-sans text-label-md text-on-surface-variant">
            {t('order.amount')}
          </Text>
          <NumericText className="font-bold text-headline-md text-primary">
            {t('event.price', { price: formatVndAmount(payment.amountVnd, i18n.language) })}
          </NumericText>
        </View>
        <View className="w-full items-center gap-1 border-t border-outline-variant pt-3">
          <Text className="font-sans text-label-md text-on-surface-variant">
            {t('order.transferNote')}
          </Text>
          <NumericText className="font-semibold text-body-lg text-on-surface">
            {payment.transferCode}
          </NumericText>
          <Text className="text-center font-sans text-label-sm text-on-surface-variant">
            {t('order.transferNoteHint')}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-2">
        <MaterialIcons name="schedule" size={18} className="text-on-surface-variant" />
        <NumericText className="font-semibold text-body-lg text-on-surface">
          {t('order.timeLeft', { time: formatCountdown(remainingMs) })}
        </NumericText>
      </View>
      <View className="flex-row items-center justify-center gap-2">
        <ActivityIndicator className="text-primary" />
        <Text className="font-sans text-label-md text-on-surface-variant">
          {t('order.waiting')}
        </Text>
      </View>
    </View>
  );
}

function ExpiredOrder({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-4 pt-6">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <MaterialIcons name="timer-off" size={40} className="text-error" />
      </View>
      <Text className="text-center font-bold text-headline-md text-on-surface">
        {t('order.expiredTitle')}
      </Text>
      <Text className="text-center font-sans text-body-md text-on-surface-variant">
        {t('order.expiredBody')}
      </Text>
      <View className="w-full gap-3 pt-2">
        <Button
          label={t('order.backToEvent')}
          onPress={() => router.replace({ pathname: '/event/[id]', params: { id: eventId } })}
        />
        <Button variant="outline" label={t('order.backHome')} onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

function PaidOrder({ order }: { order: OrderResponse }) {
  const { t } = useTranslation();
  return (
    <>
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
            <Text className="font-sans text-label-sm text-on-surface-variant">{ticket.code}</Text>
          </View>
        ))}
      </View>

      <View className="gap-3">
        <Button label={t('order.viewTickets')} onPress={() => router.replace('/tickets')} />
        <Button variant="outline" label={t('order.backHome')} onPress={() => router.replace('/')} />
      </View>
    </>
  );
}
