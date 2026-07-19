import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import type { OrganizerEventSummary } from '@/lib/api/events-organizer';
import { formatDayMonth } from '@/lib/format';

type Props = {
  event: OrganizerEventSummary;
};

function statusTone(
  status: OrganizerEventSummary['status'],
): 'neutral' | 'primary' {
  return status === 'PUBLISHED' ? 'primary' : 'neutral';
}

function OrganizerEventCardComponent({ event }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <Link
      href={{ pathname: '/organizer/events/[id]', params: { id: event.id } }}
      asChild
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={event.title}
        accessibilityHint={t('organizer.dashboard.openEvent')}
        className="min-h-40 flex-row overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest active:opacity-70"
      >
        {event.coverImageUrl ? (
          <Image
            source={event.coverImageUrl}
            contentFit="cover"
            transition={200}
            style={{ width: 104, minHeight: 160 }}
          />
        ) : (
          <View className="w-[104px] items-center justify-center bg-surface-container-low">
            <MaterialIcons name="image-not-supported" size={28} className="text-outline" />
          </View>
        )}

        <View className="min-w-0 flex-1 justify-between gap-3 p-4">
          <View className="gap-2">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label={t(`organizer.status.${event.status}`)}
                tone={statusTone(event.status)}
              />
              <Chip label={t(`event.category.${event.category}`)} />
            </View>

            <Text numberOfLines={2} className="font-semibold text-body-md text-on-surface">
              {event.title}
            </Text>
          </View>

          <View className="gap-1.5">
            <MetadataRow
              icon="calendar-today"
              text={formatDayMonth(event.startAt, i18n.language)}
            />
            <MetadataRow icon="place" text={event.city} />
            <MetadataRow
              icon="confirmation-number"
              text={t('organizer.ticketTypeCount', {
                count: event.ticketTypeCount,
              })}
            />
          </View>
        </View>

        <View className="w-8 items-center justify-center">
          <MaterialIcons name="chevron-right" size={20} className="text-on-surface-variant" />
        </View>
      </Pressable>
    </Link>
  );
}

function MetadataRow({
  icon,
  text,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <MaterialIcons name={icon} size={14} className="text-on-surface-variant" />
      <Text numberOfLines={1} className="flex-1 font-sans text-label-sm text-on-surface-variant">
        {text}
      </Text>
    </View>
  );
}

export const OrganizerEventCard = memo(OrganizerEventCardComponent);
