import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketQr } from '@/components/ticket/ticket-qr';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toUserMessage } from '@/lib/api/error-message';
import { getMyTickets, ticketsKeys, type MyTicket } from '@/lib/api/orders';
import { formatDateTime } from '@/lib/format';

const STATUS_STYLES: Record<MyTicket['status'], { container: string; text: string }> = {
  ISSUED: {
    container: 'bg-primary-container',
    text: 'text-on-primary-container',
  },
  USED: {
    container: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
  },
  VOID: {
    container: 'bg-error-container',
    text: 'text-on-error-container',
  },
};

export default function TicketsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<MyTicket | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ticketsKeys.mine(),
    queryFn: getMyTickets,
  });

  if (ticketsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator className="text-primary" />
      </View>
    );
  }

  if (ticketsQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="cloud-off"
          title={t('tickets.loadErrorTitle')}
          description={toUserMessage(ticketsQuery.error, t)}
          action={<Button label={t('common.retry')} onPress={() => void ticketsQuery.refetch()} />}
        />
      </View>
    );
  }

  const tickets = ticketsQuery.data;

  if (tickets.length === 0) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="confirmation-number"
          title={t('tickets.emptyTitle')}
          description={t('tickets.emptyDescription')}
          action={
            <Button
              variant="outline"
              label={t('tickets.emptyAction')}
              onPress={() => router.replace('/')}
            />
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="w-full max-w-content flex-1 self-center"
        contentContainerClassName="px-container-padding gap-4"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-bold text-headline-md text-on-surface">{t('tabs.tickets')}</Text>

        {tickets.map((ticket) => {
          const statusStyle = STATUS_STYLES[ticket.status];

          return (
            <Pressable
              key={ticket.id}
              accessibilityLabel={t('tickets.openQrForEvent', { event: ticket.eventTitle })}
              accessibilityRole="button"
              onPress={() => setActive(ticket)}
              className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest active:bg-surface-container-low"
            >
              <View className="gap-3 p-4">
                <View className={`self-start rounded-full px-3 py-1 ${statusStyle.container}`}>
                  <Text className={`font-medium text-label-sm ${statusStyle.text}`}>
                    {t(`tickets.status.${ticket.status.toLowerCase()}`)}
                  </Text>
                </View>

                <Text
                  numberOfLines={2}
                  className="font-semibold text-body-lg text-on-surface"
                >
                  {ticket.eventTitle}
                </Text>

                <View className="gap-2">
                  <View className="flex-row items-start gap-2">
                    <MaterialIcons name="event" size={19} className="text-primary" />
                    <Text className="flex-1 font-sans text-label-md text-on-surface-variant">
                      {formatDateTime(ticket.eventStartAt, i18n.language)}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <MaterialIcons name="location-on" size={19} className="text-primary" />
                    <Text
                      numberOfLines={2}
                      className="flex-1 font-sans text-label-md text-on-surface-variant"
                    >
                      {ticket.eventVenue}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="min-h-touch-target-min flex-row items-center justify-between gap-3 border-t border-outline-variant px-4 py-2">
                <Text
                  numberOfLines={1}
                  className="min-w-0 flex-1 font-medium text-label-md text-on-surface"
                >
                  {ticket.ticketTypeName}
                </Text>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="qr-code-2" size={20} className="text-primary" />
                  <Text className="font-semibold text-label-md text-primary">
                    {t('tickets.viewQr')}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={active !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActive(null)}
      >
        <Pressable
          onPress={() => setActive(null)}
          className="flex-1 items-center justify-center bg-black/60 px-container-padding"
        >
          {active ? (
            <View className="w-full max-w-content items-center gap-4 rounded-xl bg-surface p-6">
              <Text className="text-center font-semibold text-headline-md text-on-surface">
                {active.eventTitle}
              </Text>
              <Text className="font-sans text-label-md text-on-surface-variant">
                {active.ticketTypeName}
              </Text>
              <TicketQr value={active.qrPayload} size={240} />
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {active.code}
              </Text>
              <Button variant="outline" label={t('tickets.close')} onPress={() => setActive(null)} />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
