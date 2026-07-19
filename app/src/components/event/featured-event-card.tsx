import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { NumericText } from '@/components/ui/numeric-text';
import { TicketSurface } from '@/components/ui/ticket-surface';
import type { EventSummary } from '@/lib/api/events';
import { formatDayMonth, formatVndAmount } from '@/lib/format';

/**
 * Wide card for the horizontal "featured" carousel. Shaped as a ticket so the
 * poster sits on the face and the details sit on the stub.
 *
 * The category label that used to sit above the title is gone on purpose: it
 * repeated on every card in the same uppercase treatment, which is the loudest
 * tell of a generated layout. The poster already says what kind of event it is.
 */
export function FeaturedEventCard({ event }: { event: EventSummary }) {
  const { t, i18n } = useTranslation();

  const isFree = event.minPriceVnd === 0;
  const priceLabel = isFree
    ? t('event.free')
    : t('event.priceFrom', { price: formatVndAmount(event.minPriceVnd, i18n.language) });

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityRole="button" className="w-[280px] active:opacity-90">
        <TicketSurface
          stub={
            <View className="gap-2 p-4">
              <Text numberOfLines={2} className="font-bold text-body-lg text-on-surface">
                {event.title}
              </Text>

              {/* Date and price get a line each. Sharing one row cannot work at
                  this card width: "22/08 · TP. Hồ Chí Minh" beside
                  "From 500.000đ" either wraps or truncates the price, and the
                  price is the last thing on the card that may be cut. */}
              <View className="flex-row items-center gap-1">
                <MaterialIcons
                  name="calendar-today"
                  size={14}
                  className="text-on-surface-variant"
                />
                <Text
                  numberOfLines={1}
                  className="flex-1 font-sans text-label-md text-on-surface-variant"
                >
                  {formatDayMonth(event.startAt, i18n.language)} · {event.city}
                </Text>
              </View>

              <NumericText className="font-semibold text-label-md text-primary">
                {priceLabel}
              </NumericText>
            </View>
          }
        >
          {event.coverImageUrl ? (
            <Image
              source={event.coverImageUrl}
              contentFit="cover"
              transition={200}
              style={{ width: '100%', height: 160 }}
            />
          ) : (
            <View className="h-40 items-center justify-center bg-surface-container-low">
              <MaterialIcons name="image-not-supported" size={32} className="text-outline" />
            </View>
          )}
        </TicketSurface>
      </Pressable>
    </Link>
  );
}
