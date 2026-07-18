import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import type { CreateEventBody } from '@/lib/api/events-organizer';

const CATEGORIES: CreateEventBody['category'][] = [
  'MUSIC',
  'TECH',
  'ART',
  'SPORT',
  'WORKSHOP',
];

export type EventFormValues = {
  title: string;
  description: string;
  venue: string;
  city: string;
  category: CreateEventBody['category'];
  /** Local input form "YYYY-MM-DD HH:mm". */
  startAt: string;
  endAt: string;
  coverImageUrl: string;
  featured: boolean;
};

/** Renders an ISO timestamp as the "YYYY-MM-DD HH:mm" the inputs expect. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function parseLocalInput(value: string): Date | null {
  const parsed = new Date(value.trim().replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const EMPTY: EventFormValues = {
  title: '',
  description: '',
  venue: '',
  city: '',
  category: 'MUSIC',
  startAt: '',
  endAt: '',
  coverImageUrl: '',
  featured: false,
};

type Props = {
  initial?: Partial<EventFormValues>;
  submitLabel: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (body: CreateEventBody) => void;
};

/** Shared create/edit form. Owns its field state and client-side validation. */
export function EventForm({
  initial,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<EventFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>(
    {},
  );

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    const next: typeof errors = {};
    if (!values.title.trim()) next.title = t('organizer.error.titleRequired');
    if (!values.description.trim())
      next.description = t('organizer.error.descriptionRequired');
    if (!values.venue.trim()) next.venue = t('organizer.error.venueRequired');
    if (!values.city.trim()) next.city = t('organizer.error.cityRequired');

    const start = parseLocalInput(values.startAt);
    const end = parseLocalInput(values.endAt);
    if (!start) next.startAt = t('organizer.error.startInvalid');
    if (!end) next.endAt = t('organizer.error.endInvalid');
    if (start && end && start.getTime() >= end.getTime())
      next.endAt = t('organizer.error.endBeforeStart');

    setErrors(next);
    if (Object.keys(next).length > 0 || !start || !end) return;

    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      venue: values.venue.trim(),
      city: values.city.trim(),
      category: values.category,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      coverImageUrl: values.coverImageUrl.trim() || null,
      featured: values.featured,
    });
  }

  return (
    <View className="gap-4">
      <TextField
        label={t('organizer.form.title')}
        placeholder={t('organizer.form.titlePlaceholder')}
        value={values.title}
        onChangeText={(v) => set('title', v)}
        error={errors.title}
      />
      <TextField
        label={t('organizer.form.description')}
        placeholder={t('organizer.form.descriptionPlaceholder')}
        value={values.description}
        onChangeText={(v) => set('description', v)}
        error={errors.description}
        multiline
      />
      <TextField
        label={t('organizer.form.venue')}
        placeholder={t('organizer.form.venuePlaceholder')}
        value={values.venue}
        onChangeText={(v) => set('venue', v)}
        error={errors.venue}
      />
      <TextField
        label={t('organizer.form.city')}
        placeholder={t('organizer.form.cityPlaceholder')}
        value={values.city}
        onChangeText={(v) => set('city', v)}
        error={errors.city}
      />

      <View className="gap-2">
        <Text className="font-medium text-label-md text-on-surface-variant">
          {t('organizer.form.category')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORIES.map((value) => {
            const selected = values.category === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => set('category', value)}
                className={[
                  'rounded-full border px-4 py-2',
                  selected
                    ? 'border-primary bg-primary-container'
                    : 'border-outline',
                ].join(' ')}
              >
                <Text
                  className={[
                    'font-medium text-label-md',
                    selected
                      ? 'text-on-primary-container'
                      : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {t(`event.category.${value}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label={t('organizer.form.startAt')}
        placeholder="2026-09-01 19:00"
        helper={t('organizer.form.dateHint')}
        value={values.startAt}
        onChangeText={(v) => set('startAt', v)}
        error={errors.startAt}
        autoCapitalize="none"
      />
      <TextField
        label={t('organizer.form.endAt')}
        placeholder="2026-09-01 22:00"
        helper={t('organizer.form.dateHint')}
        value={values.endAt}
        onChangeText={(v) => set('endAt', v)}
        error={errors.endAt}
        autoCapitalize="none"
      />
      <TextField
        label={t('organizer.form.coverImageUrl')}
        placeholder={t('organizer.form.coverImageUrlPlaceholder')}
        value={values.coverImageUrl}
        onChangeText={(v) => set('coverImageUrl', v)}
        autoCapitalize="none"
        keyboardType="url"
      />

      <View className="flex-row items-center justify-between py-1">
        <Text className="font-medium text-label-md text-on-surface-variant">
          {t('organizer.form.featured')}
        </Text>
        <Switch
          value={values.featured}
          onValueChange={(v) => set('featured', v)}
        />
      </View>

      {serverError ? (
        <View className="rounded-md bg-error-container px-4 py-3">
          <Text className="font-sans text-label-md text-on-error-container">
            {serverError}
          </Text>
        </View>
      ) : null}

      <Button label={submitLabel} loading={submitting} onPress={submit} />
    </View>
  );
}
