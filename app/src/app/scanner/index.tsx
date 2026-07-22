import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getScannerEvents, scannerKeys } from '@/lib/api/scanner';
import { toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

export default function ScannerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);

  const eventsQuery = useQuery({
    queryKey: scannerKeys.events(),
    queryFn: getScannerEvents,
  });
  const events = eventsQuery.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="flex-row items-center justify-between border-b border-outline-variant px-container-padding py-4">
          <Text className="font-bold text-display-sm text-on-surface">
            {t('scanner.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('scanner.signOut')}
            onPress={() => void signOut()}
            className="active:opacity-60"
          >
            <MaterialIcons name="logout" size={24} className="text-on-surface-variant" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3 px-container-padding py-6"
        >
          {eventsQuery.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : eventsQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('scanner.loadErrorTitle')}
              description={toUserMessage(eventsQuery.error, t)}
              action={
                <Button
                  icon="refresh"
                  label={t('common.retry')}
                  onPress={() => void eventsQuery.refetch()}
                />
              }
            />
          ) : events.length === 0 ? (
            <EmptyState
              icon="qr-code-scanner"
              title={t('scanner.emptyTitle')}
              description={t('scanner.emptyDescription')}
            />
          ) : (
            <>
              <Text className="font-sans text-label-md text-on-surface-variant">
                {t('scanner.subtitle')}
              </Text>
              {events.map((event) => (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/scanner/scan/${event.id}`)}
                  className="flex-row items-center gap-3 rounded-md bg-surface-container px-4 py-4 active:opacity-70"
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    className="text-primary"
                  />
                  <View className="flex-1 gap-0.5">
                    <Text
                      numberOfLines={1}
                      className="font-semibold text-body-md text-on-surface"
                    >
                      {event.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="font-sans text-label-md text-on-surface-variant"
                    >
                      {event.venue}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    className="text-on-surface-variant"
                  />
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
