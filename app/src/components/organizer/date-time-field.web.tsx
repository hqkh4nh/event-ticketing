import { MaterialIcons } from '@expo/vector-icons';
import { type ChangeEvent, type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTokens } from '@/hooks/use-tokens';

import type { DateTimeFieldProps } from './date-time-field.types';

function toLocalDateTimeInput(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');

  return [
    value.getFullYear(),
    '-',
    pad(value.getMonth() + 1),
    '-',
    pad(value.getDate()),
    'T',
    pad(value.getHours()),
    ':',
    pad(value.getMinutes()),
  ].join('');
}

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

export function DateTimeField({
  label,
  helper,
  error,
  value,
  disabled = false,
  onChange,
}: DateTimeFieldProps) {
  const { i18n } = useTranslation();
  const tokens = useTokens();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const inputStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    cursor: disabled ? 'default' : 'pointer',
    colorScheme,
    opacity: 0,
  };
  const locale = localeFor(i18n.resolvedLanguage);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = new Date(event.currentTarget.value);
    if (!Number.isNaN(selected.getTime())) onChange(selected);
  }

  return (
    <View className="gap-2">
      <Text className="font-medium text-label-md text-on-surface-variant">
        {label}
      </Text>

      <View
        style={{
          borderColor: hasError
            ? tokens.error
            : focused
              ? tokens.primary
              : tokens.outline,
        }}
        className={[
          'relative h-touch-target-min flex-row items-center gap-3 rounded-md border bg-surface-container-lowest px-4',
          disabled ? 'opacity-50' : '',
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

        <input
          aria-label={label}
          type="datetime-local"
          step={60}
          value={toLocalDateTimeInput(value)}
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      </View>

      {hasError ? (
        <Text className="font-sans text-label-sm text-error">{error}</Text>
      ) : helper ? (
        <Text className="font-sans text-label-sm text-on-surface-variant">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export function nextWholeHour(from = new Date()): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}
