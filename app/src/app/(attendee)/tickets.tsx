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

        {tickets.map((ticket) => (
          <Pressable
            key={ticket.id}
            accessibilityRole="button"
            onPress={() => setActive(ticket)}
            className="flex-row items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 active:opacity-80"
          >
            <TicketQr value={ticket.qrPayload} size={72} />
            <View className="flex-1 gap-1">
              <Text className="font-semibold text-body-lg text-on-surface">
                {ticket.eventTitle}
              </Text>
              <Text className="font-sans text-label-md text-on-surface-variant">
                {ticket.ticketTypeName}
              </Text>
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {formatDateTime(ticket.eventStartAt, i18n.language)}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} className="text-outline" />
          </Pressable>
        ))}
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
