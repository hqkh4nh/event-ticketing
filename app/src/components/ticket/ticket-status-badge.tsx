import { Text, View } from 'react-native';

import type { MyTicket } from '@/lib/api/orders';

const STATUS_STYLES: Record<MyTicket['status'], { container: string; text: string }> = {
  // Valid tickets read as mint, not coral: coral is the brand/active colour,
  // mint is the "still valid" status. A used ticket goes neutral grey.
  ISSUED: {
    container: 'bg-success-container',
    text: 'text-on-success-container',
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
