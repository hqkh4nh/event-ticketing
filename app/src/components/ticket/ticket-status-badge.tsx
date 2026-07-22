import { Text, View } from 'react-native';

import type { MyTicket } from '@/lib/api/orders';

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

type TicketStatusBadgeProps = {
  status: MyTicket['status'];
  label: string;
};

export function TicketStatusBadge({ status, label }: TicketStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${style.container}`}>
      <Text className={`font-medium text-label-sm ${style.text}`}>{label}</Text>
    </View>
  );
}
