import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { TicketImageCard } from '@/components/ticket/ticket-image-card';
import { TicketStatusBadge } from '@/components/ticket/ticket-status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toUserMessage } from '@/lib/api/error-message';
import { getMyTickets, ticketsKeys, type MyTicket } from '@/lib/api/orders';
import { formatDateTime } from '@/lib/format';

type SaveFeedback = 'success' | 'permission' | 'error' | null;

export default function TicketsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const [active, setActive] = useState<MyTicket | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null);
  const ticketImageRef = useRef<ViewShot>(null);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: [],
  });

  const ticketsQuery = useQuery({
    queryKey: ticketsKeys.mine(),
    queryFn: getMyTickets,
  });

  if (ticketsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator className="text-primary" />
      </View>
    );
  }

  if (ticketsQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="cloud-off"
          title={t('tickets.loadErrorTitle')}
          description={toUserMessage(ticketsQuery.error, t)}
          action={<Button label={t('common.retry')} onPress={() => void ticketsQuery.refetch()} />}
        />
      </View>
    );
  }

  const tickets = ticketsQuery.data;

  function openTicket(ticket: MyTicket) {
    setSaveFeedback(null);
    setActive(ticket);
  }

  function closeTicket() {
    if (isSaving) return;
    setSaveFeedback(null);
    setActive(null);
  }

  async function saveTicketImage() {
    if (isSaving) return;
    if (Platform.OS === 'web') {
      setSaveFeedback('error');
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const permission = mediaPermission?.granted
        ? mediaPermission
        : await requestMediaPermission();
      if (!permission.granted) {
        setSaveFeedback('permission');
        return;
      }

      const uri = await ticketImageRef.current?.capture?.();
      if (!uri) throw new Error('Ticket image capture returned no file.');

      await MediaLibrary.saveToLibraryAsync(uri);
      setSaveFeedback('success');
    } catch {
      setSaveFeedback('error');
    } finally {
      setIsSaving(false);
    }
  }

  if (tickets.length === 0) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="confirmation-number"
          title={t('tickets.emptyTitle')}
          description={t('tickets.emptyDescription')}
          action={
            <Button
              variant="outline"
              label={t('tickets.emptyAction')}
              onPress={() => router.replace('/')}
            />
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="w-full max-w-content flex-1 self-center"
        contentContainerClassName="px-container-padding gap-4"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-bold text-headline-md text-on-surface">{t('tabs.tickets')}</Text>

        {tickets.map((ticket) => {
          return (
            <Pressable
              key={ticket.id}
              accessibilityLabel={t('tickets.openQrForEvent', { event: ticket.eventTitle })}
              accessibilityRole="button"
              onPress={() => openTicket(ticket)}
              className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest active:bg-surface-container-low"
            >
              <View className="gap-3 p-4">
                <TicketStatusBadge
                  status={ticket.status}
                  label={t(`tickets.status.${ticket.status.toLowerCase()}`)}
                />

                <Text
                  numberOfLines={2}
                  className="font-semibold text-body-lg text-on-surface"
                >
                  {ticket.eventTitle}
                </Text>

                <View className="gap-2">
                  <View className="flex-row items-start gap-2">
                    <MaterialIcons name="event" size={19} className="text-primary" />
                    <Text className="flex-1 font-sans text-label-md text-on-surface-variant">
                      {formatDateTime(ticket.eventStartAt, i18n.language)}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <MaterialIcons name="location-on" size={19} className="text-primary" />
                    <Text
                      numberOfLines={2}
                      className="flex-1 font-sans text-label-md text-on-surface-variant"
                    >
                      {ticket.eventVenue}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="min-h-touch-target-min flex-row items-center justify-between gap-3 border-t border-outline-variant px-4 py-2">
                <Text
                  numberOfLines={1}
                  className="min-w-0 flex-1 font-medium text-label-md text-on-surface"
                >
                  {ticket.ticketTypeName}
                </Text>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="qr-code-2" size={20} className="text-primary" />
                  <Text className="font-semibold text-label-md text-primary">
                    {t('tickets.viewQr')}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={active !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeTicket}
      >
        <View className="flex-1 items-center justify-center px-container-padding py-6">
          <Pressable
            accessibilityLabel={t('tickets.close')}
            accessibilityRole="button"
            className="absolute inset-0 bg-black/60"
            disabled={isSaving}
            onPress={closeTicket}
          />

          {active ? (
            <View
              accessibilityViewIsModal
              className="w-full overflow-hidden rounded-xl border border-outline-variant bg-surface"
              style={[themes[colorScheme], { maxWidth: 440, maxHeight: '92%' }]}
            >
              <View className="min-h-touch-target-min flex-row items-center justify-between border-b border-outline-variant px-4 py-2">
                <Text className="font-semibold text-body-lg text-on-surface">
                  {t('tickets.detailTitle')}
                </Text>
                <Pressable
                  accessibilityLabel={t('tickets.close')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSaving }}
                  className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full active:bg-surface-container-high"
                  disabled={isSaving}
                  onPress={closeTicket}
                >
                  <MaterialIcons name="close" size={24} className="text-on-surface" />
                </Pressable>
              </View>

              <ScrollView
                contentContainerClassName="gap-4 p-4"
                showsVerticalScrollIndicator={false}
              >
                <ViewShot
                  ref={ticketImageRef}
                  options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                  style={{ width: '100%' }}
                >
                  <TicketImageCard ticket={active} />
                </ViewShot>

                {saveFeedback ? (
                  <View
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                    className={[
                      'flex-row items-start gap-2 rounded-lg p-3',
                      saveFeedback === 'success' ? 'bg-success-container' : 'bg-error-container',
                    ].join(' ')}
                  >
                    <MaterialIcons
                      name={saveFeedback === 'success' ? 'check-circle' : 'error-outline'}
                      size={20}
                      className={
                        saveFeedback === 'success' ? 'text-on-success-container' : 'text-on-error-container'
                      }
                    />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text
                        className={[
                          'font-sans text-label-md',
                          saveFeedback === 'success'
                            ? 'text-on-success-container'
                            : 'text-on-error-container',
                        ].join(' ')}
                      >
                        {t(`tickets.saveFeedback.${saveFeedback}`)}
                      </Text>
                      {saveFeedback === 'permission' ? (
                        <Pressable
                          accessibilityRole="button"
                          className="self-start py-1"
                          onPress={() => void Linking.openSettings()}
                        >
                          <Text className="font-semibold text-label-md text-on-error-container underline">
                            {t('tickets.openSettings')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View className="gap-3">
                  <Button
                    icon="download"
                    label={t('tickets.saveImage')}
                    loading={isSaving}
                    onPress={() => void saveTicketImage()}
                  />
                  <Button
                    variant="outline"
                    label={t('tickets.close')}
                    disabled={isSaving}
                    onPress={closeTicket}
                  />
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
