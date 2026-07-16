import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { NumericText } from '@/components/ui/numeric-text';
import { formatDayMonth, formatVndAmount } from '@/lib/format';
import type { EventSummary } from '@/lib/mock/events';

/**
 * Compact row for the vertical event list.
 *
 * Deliberately not a card. The featured carousel above is already made of
 * ticket-shaped cards, and boxing these rows too leaves the screen as one stack
 * of identical containers. The list separates on a hairline instead, which also
 * lets the thumbnails line up as a column the eye can run down.
 */
export function EventListItem({ event }: { event: EventSummary }) {
  const { t, i18n } = useTranslation();

  const isFree = event.minPriceVnd === 0;
  const priceLabel = isFree
    ? t('event.free')
    : t('event.priceFrom', { price: formatVndAmount(event.minPriceVnd, i18n.language) });

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-4 py-3 active:opacity-60"
      >
        <Image
          source={event.coverImageUrl}
          contentFit="cover"
          transition={200}
          style={{ width: 72, height: 72, borderRadius: 12 }}
        />

        <View className="flex-1 gap-1">
          <Text numberOfLines={2} className="font-semibold text-body-md text-on-surface">
            {event.title}
          </Text>

          <Text className="font-sans text-label-md text-on-surface-variant">
            {formatDayMonth(event.startAt, i18n.language)} · {event.city}
          </Text>

          <NumericText className="font-medium text-label-md text-primary">
            {priceLabel}
          </NumericText>
        </View>
      </Pressable>
    </Link>
  );
}
