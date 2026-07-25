import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { AdminStatusBadge } from '@/components/admin/admin-ui';
import type { AdminEvent } from '@/lib/api/admin';

export function AdminEventCard({
  event,
  statusLabel,
  soldLabel,
  featuredLabel,
  featureLabel,
  unfeatureLabel,
  formattedDate,
  onToggleFeatured,
  busy = false,
}: {
  event: AdminEvent;
  statusLabel: string;
  soldLabel: string;
  featuredLabel: string;
  featureLabel: string;
  unfeatureLabel: string;
  formattedDate: string;
  onToggleFeatured: () => void;
  busy?: boolean;
}) {
  const featureDisabled =
    busy || (!event.featured && event.status !== 'PUBLISHED');

  return (
    <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <View className="flex-row gap-3 p-4">
        <View className="h-20 w-20 items-center justify-center rounded-lg bg-primary-container">
          <MaterialIcons name="event" size={32} className="text-on-primary-container" />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <AdminStatusBadge status={event.status} label={statusLabel} />
            {event.featured ? (
              <View className="flex-row items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1">
                <MaterialIcons name="star" size={13} className="text-on-secondary-container" />
                <Text className="font-medium text-label-sm text-on-secondary-container">
                  {featuredLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={2} className="font-semibold text-body-md text-on-surface">
            {event.title}
          </Text>
          <Text numberOfLines={1} className="font-sans text-label-sm text-on-surface-variant">
            {event.organizerName}
          </Text>
        </View>
      </View>

      <View className="gap-2 border-t border-outline-variant px-4 py-3">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="schedule" size={17} className="text-on-surface-variant" />
          <Text className="font-sans text-label-sm text-on-surface-variant">
            {formattedDate}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="location-on" size={17} className="text-on-surface-variant" />
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 font-sans text-label-sm text-on-surface-variant"
          >
            {event.venue}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="confirmation-number" size={17} className="text-primary" />
          <Text className="font-medium text-label-sm text-primary">
            {soldLabel}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 border-t border-outline-variant p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: featureDisabled }}
          disabled={featureDisabled}
          onPress={onToggleFeatured}
          className={[
            'h-touch-target-min flex-1 flex-row items-center justify-center gap-2 rounded-full border border-outline active:bg-surface-container',
            featureDisabled ? 'opacity-40' : '',
          ].join(' ')}
        >
          <MaterialIcons
            name={event.featured ? 'star-outline' : 'star'}
            size={18}
            className="text-on-surface"
          />
          <Text className="font-semibold text-label-sm text-on-surface">
            {event.featured ? unfeatureLabel : featureLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
