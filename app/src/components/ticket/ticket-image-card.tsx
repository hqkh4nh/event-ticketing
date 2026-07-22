import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { themes } from '@/design/themes';
import type { MyTicket } from '@/lib/api/orders';
import { formatDateTime } from '@/lib/format';

import { TicketQr } from './ticket-qr';
import { TicketStatusBadge } from './ticket-status-badge';

type TicketImageCardProps = {
  ticket: MyTicket;
};

export function TicketImageCard({ ticket }: TicketImageCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <View
      collapsable={false}
      className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
      style={themes.light}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-bold text-body-lg text-primary">Viora</Text>
        <TicketStatusBadge
          status={ticket.status}
          label={t(`tickets.status.${ticket.status.toLowerCase()}`)}
        />
      </View>

      <View className="gap-1">
        <Text className="font-bold text-headline-md text-on-surface">{ticket.eventTitle}</Text>
        <Text className="font-sans text-label-md text-on-surface-variant">
          {ticket.ticketTypeName}
        </Text>
      </View>

      <View className="gap-2 border-y border-outline-variant py-3">
        <View className="flex-row items-start gap-2">
          <MaterialIcons name="event" size={19} className="text-primary" />
          <Text className="flex-1 font-sans text-label-md text-on-surface-variant">
            {formatDateTime(ticket.eventStartAt, i18n.language)}
          </Text>
        </View>
        <View className="flex-row items-start gap-2">
          <MaterialIcons name="location-on" size={19} className="text-primary" />
          <Text className="flex-1 font-sans text-label-md text-on-surface-variant">
            {ticket.eventVenue}
          </Text>
        </View>
      </View>

      <View className="items-center gap-3">
        <TicketQr value={ticket.qrPayload} size={200} />
        <View className="items-center gap-1">
          <Text className="font-sans text-label-sm text-on-surface-variant">
            {t('tickets.ticketCode')}
          </Text>
          <Text className="font-medium text-label-md text-on-surface">{ticket.code}</Text>
        </View>
      </View>

      <View className="flex-row items-start gap-2 rounded-lg bg-warning-container p-3">
        <MaterialIcons name="shield" size={19} className="text-on-warning-container" />
        <Text className="flex-1 font-sans text-label-sm text-on-warning-container">
          {t('tickets.securityWarning')}
        </Text>
      </View>
    </View>
  );
}
