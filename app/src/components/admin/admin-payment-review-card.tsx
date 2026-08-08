import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { PaymentReview } from '@/lib/api/payment-reviews';

function DetailRow({
  icon,
  value,
  lines = 1,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  lines?: number;
}) {
  return (
    <View className="flex-row items-start gap-2">
      <MaterialIcons name={icon} size={17} className="text-on-surface-variant" />
      <Text
        numberOfLines={lines}
        className="min-w-0 flex-1 font-sans text-label-sm text-on-surface-variant"
      >
        {value}
      </Text>
    </View>
  );
}

export function AdminPaymentReviewCard({
  review,
  statusLabel,
  amountLabel,
  receivedLabel,
  orderLabel,
  buyerLabel,
  reasonLabel,
  resolvedLabel,
  noteLabel,
  resolveLabel,
  onResolve,
  busy = false,
}: {
  review: PaymentReview;
  statusLabel: string;
  amountLabel: string;
  receivedLabel: string;
  orderLabel?: string;
  buyerLabel?: string;
  reasonLabel?: string;
  resolvedLabel?: string;
  noteLabel?: string;
  resolveLabel: string;
  onResolve: () => void;
  busy?: boolean;
}) {
  const open = review.reviewedAt === null;
  // UNMATCHED means the transfer matched no order at all, which is the harder
  // case to chase, so it reads as an error rather than a warning.
  const tone =
    review.status === 'UNMATCHED'
      ? {
          chip: 'bg-error-container',
          text: 'text-on-error-container',
          icon: 'help-outline' as const,
        }
      : {
          chip: 'bg-warning-container',
          text: 'text-on-warning-container',
          icon: 'schedule' as const,
        };

  return (
    <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <View className="gap-2 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <View
            className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${tone.chip}`}
          >
            <MaterialIcons
              name={tone.icon}
              size={13}
              className={tone.text}
            />
            <Text className={`font-medium text-label-sm ${tone.text}`}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text className="font-bold text-numeric-lg text-on-surface">
          {amountLabel}
        </Text>
        <Text
          numberOfLines={1}
          className="font-mono text-label-sm text-on-surface-variant"
        >
          {review.sepayTxnId}
        </Text>
      </View>

      <View className="gap-2 border-t border-outline-variant px-4 py-3">
        <DetailRow icon="schedule" value={receivedLabel} />
        {review.transferContent ? (
          <DetailRow icon="notes" value={review.transferContent} lines={2} />
        ) : null}
        {orderLabel ? <DetailRow icon="receipt-long" value={orderLabel} /> : null}
        {buyerLabel ? <DetailRow icon="person" value={buyerLabel} /> : null}
        {reasonLabel ? (
          <DetailRow icon="report-problem" value={reasonLabel} lines={3} />
        ) : null}
        {resolvedLabel ? (
          <DetailRow icon="task-alt" value={resolvedLabel} />
        ) : null}
        {noteLabel ? (
          <DetailRow icon="sticky-note-2" value={noteLabel} lines={3} />
        ) : null}
      </View>

      {open ? (
        <View className="border-t border-outline-variant p-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={onResolve}
            className={[
              'h-touch-target-min flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-80',
              busy ? 'opacity-40' : '',
            ].join(' ')}
          >
            <MaterialIcons
              name="task-alt"
              size={18}
              className="text-on-primary"
            />
            <Text className="font-semibold text-label-sm text-on-primary">
              {resolveLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
