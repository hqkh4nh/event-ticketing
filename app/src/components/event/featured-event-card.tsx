import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Chip } from '@/components/ui/chip';
import { NumericText } from '@/components/ui/numeric-text';
import { TicketSurface } from '@/components/ui/ticket-surface';
import { palette } from '@/design/tokens';
import type { EventSummary } from '@/lib/api/events';
import { formatDayMonth, formatVndAmount } from '@/lib/format';

// The scrim is always Ink so the overlaid white title reads regardless of theme.
const SCRIM = palette.dark.surface;

/**
 * Wide card for the horizontal "featured" carousel. Shaped as a ticket: the
 * poster is the face, the details sit on the stub. The title is laid over the
 * poster on a dark scrim so the image leads and the type stays legible, with a
 * single category chip in the corner - the poster carries the rest.
 */
/** `fullWidth` fills the parent; `posterHeight` creates the taller carousel variant. */
export function FeaturedEventCard({
  event,
  fullWidth = false,
  posterHeight,
}: {
  event: EventSummary;
  fullWidth?: boolean;
  posterHeight?: number;
}) {
  const { t, i18n } = useTranslation();
  const isCarousel = posterHeight !== undefined;

  const isFree = event.minPriceVnd === 0;
  const priceLabel = isFree
    ? t('event.free')
    : t('event.priceFrom', { price: formatVndAmount(event.minPriceVnd, i18n.language) });

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className={`${fullWidth ? 'w-full' : 'w-[280px]'} active:opacity-90`}
      >
        <TicketSurface
          stub={
            <View className={isCarousel ? 'gap-3 px-5 py-4' : 'gap-2 p-4'}>
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="calendar-today"
                  size={isCarousel ? 16 : 14}
                  className="text-on-surface-variant"
                />
                <Text
                  numberOfLines={1}
                  className={[
                    'flex-1 font-sans text-on-surface-variant',
                    isCarousel ? 'text-body-md' : 'text-label-md',
                  ].join(' ')}
                >
                  {formatDayMonth(event.startAt, i18n.language)} · {event.city}
                </Text>
              </View>

              <NumericText
                className={[
                  'font-semibold text-primary',
                  isCarousel ? 'text-body-md' : 'text-label-md',
                ].join(' ')}
              >
                {priceLabel}
              </NumericText>
            </View>
          }
        >
          <View
            className={isCarousel ? 'relative' : 'relative h-40'}
            style={isCarousel ? { height: posterHeight } : undefined}
          >
            {event.coverImageUrl ? (
              <Image
                source={event.coverImageUrl}
                contentFit="cover"
                transition={200}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View className="h-full items-center justify-center bg-surface-container-low">
                <MaterialIcons name="image-not-supported" size={32} className="text-outline" />
              </View>
            )}

            {/* Dark scrim, transparent at the top, so the overlaid title reads. */}
            <View
              className={[
                'absolute inset-x-0 bottom-0',
                isCarousel ? 'h-32' : 'h-24',
              ].join(' ')}
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="posterScrim" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={SCRIM} stopOpacity="0" />
                    <Stop offset="1" stopColor={SCRIM} stopOpacity="0.82" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#posterScrim)" />
              </Svg>
            </View>

            <View
              className={[
                'absolute',
                isCarousel ? 'left-4 top-4' : 'left-3 top-3',
              ].join(' ')}
            >
              <Chip tone="primary" label={t(`event.category.${event.category}`)} />
            </View>

            <Text
              numberOfLines={2}
              className={[
                'absolute inset-x-0 bottom-0 font-display text-white',
                isCarousel ? 'p-4 text-headline-md' : 'p-3 text-body-lg',
              ].join(' ')}
            >
              {event.title}
            </Text>
          </View>
        </TicketSurface>
      </Pressable>
    </Link>
  );
}
