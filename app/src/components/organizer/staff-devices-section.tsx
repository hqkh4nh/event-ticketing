import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { toUserMessage } from '@/lib/api/error-message';
import {
  createEventStaff,
  getEventStaff,
  reconnectStaff,
  staffKeys,
  updateStaff,
  type StaffDevice,
} from '@/lib/api/staff';
import { formatDateTime } from '@/lib/format';

type IssuedCode = { label: string; connectCode: string; expiresAt: string };

/**
 * Scanner devices of one event: create a device (shows its one-time connect
 * code as text + QR), block/unblock, and issue a fresh code. The code panel is
 * the only place the plaintext ever appears — the server stores a hash.
 */
export function StaffDevicesSection({
  eventId,
  locale,
  onError,
}: {
  eventId: string;
  locale: string;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [label, setLabel] = useState('');
  const [labelError, setLabelError] = useState<string | undefined>();
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const { data: devices = [], isLoading } = useQuery({
    queryKey: staffKeys.byEvent(eventId),
    queryFn: () => getEventStaff(eventId),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: staffKeys.byEvent(eventId) });
  }

  const create = useMutation({
    mutationFn: (deviceLabel: string) =>
      createEventStaff(eventId, { label: deviceLabel }),
    onSuccess: (res) => {
      setLabel('');
      setIssued({
        label: res.staff.label,
        connectCode: res.connectCode,
        expiresAt: res.expiresAt,
      });
      invalidate();
    },
    onError: (err) => onError(toUserMessage(err, t)),
  });

  const reconnect = useMutation({
    mutationFn: (device: StaffDevice) =>
      reconnectStaff(device.id).then((res) => ({ device, res })),
    onSuccess: ({ device, res }) => {
      setIssued({
        label: device.label,
        connectCode: res.connectCode,
        expiresAt: res.expiresAt,
      });
      invalidate();
    },
    onError: (err) => onError(toUserMessage(err, t)),
  });

  const toggleBlock = useMutation({
    mutationFn: (device: StaffDevice) =>
      updateStaff(device.id, {
        status: device.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
      }),
    onSuccess: () => invalidate(),
    onError: (err) => onError(toUserMessage(err, t)),
  });

  function submit() {
    const value = label.trim();
    if (!value) {
      setLabelError(t('organizer.staff.labelRequired'));
      return;
    }
    setLabelError(undefined);
    create.mutate(value);
  }

  return (
    <View className="gap-3 border-t border-outline-variant pt-6">
      <Text className="font-semibold text-headline-md text-on-surface">
        {t('organizer.staff.heading')}
      </Text>

      {issued ? (
        <View className="items-center gap-3 rounded-md border border-primary bg-surface-container px-4 py-5">
          <Text className="font-semibold text-body-md text-on-surface">
            {t('organizer.staff.codeFor', { label: issued.label })}
          </Text>
          <View className="rounded-md bg-white p-3">
            <QRCode value={issued.connectCode} size={140} />
          </View>
          <Text
            selectable
            className="font-bold text-display-sm tracking-widest text-on-surface"
          >
            {issued.connectCode}
          </Text>
          <Text className="text-center font-sans text-label-md text-on-surface-variant">
            {t('organizer.staff.codeExpires', {
              date: formatDateTime(issued.expiresAt, locale),
            })}
          </Text>
          <Text className="text-center font-sans text-label-md text-on-surface-variant">
            {t('organizer.staff.codeOnce')}
          </Text>
          <Button
            variant="outline"
            label={t('organizer.staff.codeDone')}
            onPress={() => setIssued(null)}
          />
        </View>
      ) : null}

      {isLoading ? null : devices.length === 0 ? (
        <Text className="font-sans text-label-md text-on-surface-variant">
          {t('organizer.staff.empty')}
        </Text>
      ) : (
        <View className="gap-2">
          {devices.map((device) => (
            <View
              key={device.id}
              className="flex-row items-center gap-3 rounded-md bg-surface-container px-4 py-3"
            >
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold text-body-md text-on-surface">
                    {device.label}
                  </Text>
                  <Chip
                    label={t(`organizer.staff.status.${device.status}`)}
                    tone={device.status === 'ACTIVE' ? 'primary' : 'neutral'}
                  />
                </View>
                <Text className="font-sans text-label-md text-on-surface-variant">
                  {device.lastScanAt
                    ? t('organizer.staff.lastScan', {
                        date: formatDateTime(device.lastScanAt, locale),
                      })
                    : t('organizer.staff.neverScanned')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('organizer.staff.reconnect')}
                disabled={reconnect.isPending}
                onPress={() => reconnect.mutate(device)}
                className="active:opacity-60"
              >
                <MaterialIcons name="qr-code-2" size={22} className="text-primary" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  device.status === 'BLOCKED'
                    ? 'organizer.staff.unblock'
                    : 'organizer.staff.block',
                )}
                disabled={toggleBlock.isPending}
                onPress={() => toggleBlock.mutate(device)}
                className="active:opacity-60"
              >
                <MaterialIcons
                  name={device.status === 'BLOCKED' ? 'lock-open' : 'block'}
                  size={22}
                  className={
                    device.status === 'BLOCKED' ? 'text-primary' : 'text-error'
                  }
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="gap-3 rounded-md border border-outline-variant p-4">
        <TextField
          label={t('organizer.staff.labelField')}
          placeholder={t('organizer.staff.labelPlaceholder')}
          value={label}
          onChangeText={setLabel}
          error={labelError}
        />
        <Button
          variant="outline"
          icon="add"
          label={t('organizer.staff.add')}
          loading={create.isPending}
          onPress={submit}
        />
      </View>
    </View>
  );
}
