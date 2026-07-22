import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTokens } from '@/hooks/use-tokens';

import type { DateTimeFieldProps } from './date-time-field.types';

const ONE_HOUR_MS = 60 * 60 * 1000;

function localeFor(language?: string): string {
  return language?.startsWith('vi') ? 'vi-VN' : 'en-US';
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function formatTime(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function SupportText({ error, helper }: Pick<DateTimeFieldProps, 'error' | 'helper'>) {
  if (!error && !helper) return null;

  return (
    <Text
      className={[
        'font-sans text-label-sm',
        error ? 'text-error' : 'text-on-surface-variant',
      ].join(' ')}
    >
      {error ?? helper}
    </Text>
  );
}

export function DateTimeField({
  label,
  helper,
  error,
  value,
  disabled = false,
  onChange,
}: DateTimeFieldProps) {
  const { i18n, t } = useTranslation();
  const tokens = useTokens();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const locale = localeFor(i18n.resolvedLanguage);
  const hasError = Boolean(error);

  function openPicker() {
    if (disabled) return;

    if (Platform.OS === 'ios') {
      setDraftValue(value);
      setIosPickerOpen(true);
      return;
    }

    openAndroidPicker();
  }

  function openAndroidPicker() {
    if (disabled) return;

    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      display: 'calendar',
      onChange: (dateEvent: DateTimePickerEvent, selectedDate?: Date) => {
        if (dateEvent.type !== 'set' || !selectedDate) return;

        const dateWithCurrentTime = new Date(value);
        dateWithCurrentTime.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );

        DateTimePickerAndroid.open({
          value: dateWithCurrentTime,
          mode: 'time',
          display: 'clock',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
            if (timeEvent.type !== 'set' || !selectedTime) return;

            const nextValue = new Date(dateWithCurrentTime);
            nextValue.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0,
            );
            onChange(nextValue);
          },
        });
      },
    });
  }

  return (
    <View className="gap-2">
      <Text className="font-medium text-label-md text-on-surface-variant">
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        className={[
          'h-touch-target-min flex-row items-center gap-3 rounded-md border bg-surface-container-lowest px-4',
          hasError ? 'border-error' : 'border-outline',
          disabled ? 'opacity-50' : 'active:opacity-70',
        ].join(' ')}
      >
        <MaterialIcons name="calendar-today" size={20} className="text-primary" />
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="font-medium text-label-md text-on-surface"
          >
            {formatDate(value, locale)}
          </Text>
          <Text className="font-sans text-label-sm text-on-surface-variant">
            {formatTime(value, locale)}
          </Text>
        </View>
      </Pressable>

      <SupportText error={error} helper={helper} />

      {Platform.OS === 'ios' ? (
        <Modal
          visible={iosPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosPickerOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View
              style={[themes[colorScheme], { height: '55%' }]}
              className="overflow-hidden rounded-t-xl bg-surface"
            >
              <SafeAreaView edges={['bottom']} className="flex-1">
                <View className="flex-row items-center justify-between border-b border-outline-variant px-container-padding py-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIosPickerOpen(false)}
                    className="min-h-touch-target-min justify-center pr-4 active:opacity-60"
                  >
                    <Text className="font-medium text-label-md text-on-surface-variant">
                      {t('common.cancel')}
                    </Text>
                  </Pressable>
                  <Text className="font-semibold text-body-md text-on-surface">{label}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(draftValue);
                      setIosPickerOpen(false);
                    }}
                    className="min-h-touch-target-min justify-center pl-4 active:opacity-60"
                  >
                    <Text className="font-semibold text-label-md text-primary">
                      {t('common.done')}
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-1 items-center px-container-padding pt-4">
                  <DateTimePicker
                    value={draftValue}
                    mode="datetime"
                    display="inline"
                    locale={locale}
                    accentColor={tokens.primary}
                    themeVariant={colorScheme}
                    onChange={(event, selectedDate) => {
                      if (event.type === 'set' && selectedDate) setDraftValue(selectedDate);
                    }}
                  />
                </View>
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export function nextWholeHour(from = new Date()): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setTime(next.getTime() + ONE_HOUR_MS);
  return next;
}
