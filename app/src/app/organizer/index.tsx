import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listMyEvents,
  type OrganizerEventSummary,
} from '@/lib/api/events-organizer';
import { formatDayMonth } from '@/lib/format';

type EventStatus = OrganizerEventSummary['status'];

function statusTone(status: EventStatus): 'neutral' | 'primary' {
  return status === 'PUBLISHED' ? 'primary' : 'neutral';
}

export default function OrganizerEventsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['organizer', 'events'],
    queryFn: listMyEvents,
  });

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center px-container-padding">
        <View className="flex-row items-center justify-between py-4">
          <Text className="font-bold text-display-sm text-on-surface">
            {t('organizer.title')}
          </Text>
          <Button
            label={t('organizer.create')}
            onPress={() => router.push('/organizer/events/new')}
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator className="text-primary" />
          </View>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="event-note"
            title={t('organizer.emptyTitle')}
            description={t('organizer.emptyDescription')}
            action={
              <Button
                label={t('organizer.create')}
                onPress={() => router.push('/organizer/events/new')}
              />
            }
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => (
              <View className="h-px bg-outline-variant" />
            )}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/organizer/events/[id]',
                    params: { id: item.id },
                  })
                }
                className="flex-row items-center gap-3 py-4 active:opacity-60"
              >
                <View className="flex-1 gap-1">
                  <Text
                    numberOfLines={1}
                    className="font-semibold text-body-md text-on-surface"
                  >
                    {item.title}
                  </Text>
                  <Text className="font-sans text-label-md text-on-surface-variant">
                    {formatDayMonth(item.startAt, i18n.language)} · {item.city}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('organizer.ticketTypeCount', {
                      count: item.ticketTypeCount,
                    })}
                  </Text>
                </View>
                <Chip
                  label={t(`organizer.status.${item.status}`)}
                  tone={statusTone(item.status)}
                />
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  className="text-on-surface-variant"
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
