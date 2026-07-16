import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { formatDayMonth, formatVndAmount } from '@/lib/format';
import type { EventSummary } from '@/lib/mock/events';

/** Compact row for the vertical event list on the home screen. */
export function EventListItem({ event }: { event: EventSummary }) {
  const { t } = useTranslation();

  const isFree = event.minPriceVnd === 0;
  const priceLabel = isFree
    ? t('event.free')
    : t('event.priceFrom', { price: formatVndAmount(event.minPriceVnd) });

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 active:opacity-90 dark:border-d-outline-variant dark:bg-d-surface-container"
      >
        <Image
          source={event.coverImageUrl}
          contentFit="cover"
          transition={200}
          style={{ width: 96, height: 96, borderRadius: 12 }}
        />

        <View className="flex-1 gap-2">
          <Text
            numberOfLines={2}
            className="font-bold text-[16px] leading-6 text-on-surface dark:text-d-on-surface"
          >
            {event.title}
          </Text>

          <Text className="font-medium text-[12px] leading-4 text-on-surface-variant dark:text-d-on-surface-variant">
            {formatDayMonth(event.startAt)} · {event.city}
          </Text>

          <Chip label={priceLabel} variant={isFree ? 'filled' : 'tonal'} />
        </View>
      </Pressable>
    </Link>
  );
}
