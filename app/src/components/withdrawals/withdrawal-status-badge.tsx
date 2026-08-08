import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { WithdrawalStatus } from '@/lib/api/withdrawals';

const STATUS_TONES: Record<
  WithdrawalStatus,
  { surface: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  PENDING: {
    surface: 'bg-warning-container',
    text: 'text-on-warning-container',
    icon: 'schedule',
  },
  APPROVED: {
    surface: 'bg-primary-container',
    text: 'text-on-primary-container',
    icon: 'verified',
  },
  PAID: {
    surface: 'bg-success-container',
    text: 'text-on-success-container',
    icon: 'payments',
  },
  REJECTED: {
    surface: 'bg-error-container',
    text: 'text-on-error-container',
    icon: 'block',
  },
  CANCELLED: {
    surface: 'bg-surface-container',
    text: 'text-on-surface-variant',
    icon: 'close',
  },
};

/** Mirrors AdminStatusBadge, scoped to the withdrawal lifecycle. */
export function WithdrawalStatusBadge({
  status,
  label,
}: {
  status: WithdrawalStatus;
  label: string;
}) {
  const colors = STATUS_TONES[status];

  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${colors.surface}`}
    >
      <MaterialIcons name={colors.icon} size={13} className={colors.text} />
      <Text className={`font-medium text-label-sm ${colors.text}`}>{label}</Text>
    </View>
  );
}
