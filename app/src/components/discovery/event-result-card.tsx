import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { NumericText } from '@/components/ui/numeric-text';
import type { EventSummary } from '@/lib/api/events';
import { formatDayMonth, formatVndAmount } from '@/lib/format';

type EventResultCardProps = {
  event: EventSummary;
};

/** Full-width search result card sized for the phone discovery list. */
export function EventResultCard({ event }: EventResultCardProps) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [event.coverImageUrl]);

  const priceLabel =
    event.minPriceVnd === 0
      ? t('event.free')
      : t('event.priceFrom', {
          price: formatVndAmount(event.minPriceVnd, i18n.language),
        });
  const showPoster = Boolean(event.coverImageUrl) && !imageFailed;

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityRole="button" className="w-full active:opacity-80">
        <View className="min-h-28 flex-row items-center gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-2">
          <View className="h-28 w-[104px] shrink-0 overflow-hidden rounded-ctl bg-surface-container-low">
            {showPoster ? (
              <Image
                contentFit="cover"
                onError={() => setImageFailed(true)}
                source={event.coverImageUrl}
                style={{ width: '100%', height: '100%' }}
                transition={200}
              />
            ) : (
              <View className="h-full items-center justify-center">
                <MaterialIcons name="image-not-supported" size={28} className="text-outline" />
              </View>
            )}
          </View>

          <View className="min-w-0 flex-1 gap-1">
            <Chip tone="primary" label={t(`event.category.${event.category}`)} />

            <Text numberOfLines={2} className="font-semibold text-body-md text-on-surface">
              {event.title}
            </Text>

            <View className="flex-row items-center gap-1.5">
              <MaterialIcons name="calendar-today" size={14} className="text-on-surface-variant" />
              <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-label-sm text-on-surface-variant">
                {formatDayMonth(event.startAt, i18n.language)} · {event.city}
              </Text>
            </View>

            <NumericText numberOfLines={1} className="font-semibold text-label-md text-primary">
              {priceLabel}
            </NumericText>
          </View>

          <MaterialIcons name="chevron-right" size={24} className="shrink-0 text-on-surface-variant" />
        </View>
      </Pressable>
    </Link>
  );
}
