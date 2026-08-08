import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { WithdrawalStatusBadge } from '@/components/withdrawals/withdrawal-status-badge';
import type { Withdrawal } from '@/lib/api/withdrawals';

function DetailRow({
  icon,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <MaterialIcons name={icon} size={17} className="text-on-surface-variant" />
      <Text
        numberOfLines={1}
        className="min-w-0 flex-1 font-sans text-label-sm text-on-surface-variant"
      >
        {value}
      </Text>
    </View>
  );
}

export function AdminWithdrawalCard({
  withdrawal,
  statusLabel,
  amountLabel,
  bankLabel,
  submittedLabel,
  noteLabel,
  rejectionLabel,
  referenceLabel,
  approveLabel,
  rejectLabel,
  markPaidLabel,
  onApprove,
  onReject,
  onMarkPaid,
  busy = false,
}: {
  withdrawal: Withdrawal;
  statusLabel: string;
  amountLabel: string;
  bankLabel: string;
  submittedLabel: string;
  noteLabel?: string;
  rejectionLabel?: string;
  referenceLabel?: string;
  approveLabel: string;
  rejectLabel: string;
  markPaidLabel: string;
  onApprove: () => void;
  onReject: () => void;
  onMarkPaid: () => void;
  busy?: boolean;
}) {
  const pending = withdrawal.status === 'PENDING';
  const approved = withdrawal.status === 'APPROVED';

  return (
    <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <View className="gap-2 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <WithdrawalStatusBadge
              status={withdrawal.status}
              label={statusLabel}
            />
            <Text className="font-bold text-numeric-lg text-on-surface">
              {amountLabel}
            </Text>
          </View>
        </View>
        <Text
          numberOfLines={1}
          className="font-semibold text-body-md text-on-surface"
        >
          {withdrawal.organizerName}
        </Text>
        {withdrawal.organizerEmail ? (
          <Text
            numberOfLines={1}
            className="font-sans text-label-sm text-on-surface-variant"
          >
            {withdrawal.organizerEmail}
          </Text>
        ) : null}
      </View>

      <View className="gap-2 border-t border-outline-variant px-4 py-3">
        <DetailRow icon="account-balance" value={bankLabel} />
        <DetailRow icon="schedule" value={submittedLabel} />
        {noteLabel ? <DetailRow icon="sticky-note-2" value={noteLabel} /> : null}
        {rejectionLabel ? (
          <DetailRow icon="cancel" value={rejectionLabel} />
        ) : null}
        {referenceLabel ? (
          <DetailRow icon="receipt-long" value={referenceLabel} />
        ) : null}
      </View>

      {pending || approved ? (
        <View className="flex-row gap-2 border-t border-outline-variant p-3">
          {pending ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={onApprove}
              className="h-touch-target-min flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-80"
            >
              <MaterialIcons
                name="verified"
                size={18}
                className="text-on-primary"
              />
              <Text className="font-semibold text-label-sm text-on-primary">
                {approveLabel}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={onMarkPaid}
              className="h-touch-target-min flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-80"
            >
              <MaterialIcons
                name="payments"
                size={18}
                className="text-on-primary"
              />
              <Text className="font-semibold text-label-sm text-on-primary">
                {markPaidLabel}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={onReject}
            className={[
              'h-touch-target-min flex-1 flex-row items-center justify-center gap-2 rounded-full border border-outline active:bg-surface-container',
              busy ? 'opacity-40' : '',
            ].join(' ')}
          >
            <MaterialIcons name="block" size={18} className="text-on-surface" />
            <Text className="font-semibold text-label-sm text-on-surface">
              {rejectLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
