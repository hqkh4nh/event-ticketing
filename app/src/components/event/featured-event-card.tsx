import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { formatDayMonth } from '@/lib/format';
import type { EventSummary } from '@/lib/mock/events';

/** Wide card for the horizontal "featured" carousel on the home screen. */
export function FeaturedEventCard({ event }: { event: EventSummary }) {
  const { t } = useTranslation();
  const tokens = useTokens();

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="w-[280px] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest active:opacity-90 dark:border-d-outline-variant dark:bg-d-surface-container"
      >
        <Image
          source={event.coverImageUrl}
          contentFit="cover"
          transition={200}
          style={{ width: '100%', height: 160 }}
        />

        <View className="gap-2 p-4">
          <Text className="font-medium text-[12px] uppercase leading-4 tracking-wider text-primary dark:text-d-primary">
            {t(`event.category.${event.category}`)}
          </Text>

          <Text
            numberOfLines={2}
            className="font-bold text-[18px] leading-6 text-on-surface dark:text-d-on-surface"
          >
            {event.title}
          </Text>

          <View className="flex-row items-center gap-1">
            <MaterialIcons
              name="calendar-today"
              size={14}
              color={tokens.onSurfaceVariant}
            />
            <Text className="font-medium text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
              {formatDayMonth(event.startAt)} · {event.city}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
