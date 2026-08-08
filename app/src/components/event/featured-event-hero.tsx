import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { NumericText } from '@/components/ui/numeric-text';
import { TicketSurface } from '@/components/ui/ticket-surface';
import type { EventSummary } from '@/lib/api/events';
import { formatDayMonth, formatVndAmount } from '@/lib/format';

/**
 * The featured slide at desktop width, laid out the way a ticket actually
 * tears: poster on the face, details on a stub beside it.
 *
 * The phone card overlays its title on a scrim across the bottom of the poster
 * because a 280px card has nowhere else to put it. A stub this wide does, so
 * the title moves off the image and the poster is left to lead on its own.
 */
export function FeaturedEventHero({
  event,
  height,
  stubWidth,
}: {
  event: EventSummary;
  height: number;
  stubWidth: number;
}) {
  const { t, i18n } = useTranslation();

  const priceLabel =
    event.minPriceVnd === 0
      ? t('event.free')
      : t('event.priceFrom', {
          price: formatVndAmount(event.minPriceVnd, i18n.language),
        });

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityRole="button" className="w-full active:opacity-90">
        <TicketSurface
          orientation="vertical"
          stub={
            <View
              className="justify-between gap-4 px-6 py-5"
              style={{ width: stubWidth }}
            >
              <View className="min-w-0 gap-3">
                <Chip tone="primary" label={t(`event.category.${event.category}`)} />
                <Text
                  numberOfLines={3}
                  className="font-display text-display-sm text-on-surface"
                >
                  {event.title}
                </Text>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons
                    name="calendar-today"
                    size={16}
                    className="text-on-surface-variant"
                  />
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 font-sans text-body-md text-on-surface-variant"
                  >
                    {formatDayMonth(event.startAt, i18n.language)} · {event.city}
                  </Text>
                </View>

                <NumericText className="font-semibold text-headline-md text-primary">
                  {priceLabel}
                </NumericText>

                <View className="flex-row items-center gap-1">
                  <Text className="font-semibold text-label-md text-primary">
                    {t('home.viewEvent')}
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    className="text-primary"
                  />
                </View>
              </View>
            </View>
          }
        >
          {event.coverImageUrl ? (
            <Image
              source={event.coverImageUrl}
              contentFit="cover"
              transition={200}
              style={{ width: '100%', height }}
            />
          ) : (
            <View
              className="items-center justify-center bg-surface-container-low"
              style={{ height }}
            >
              <MaterialIcons
                name="image-not-supported"
                size={40}
                className="text-outline"
              />
            </View>
          )}
        </TicketSurface>
      </Pressable>
    </Link>
  );
}
