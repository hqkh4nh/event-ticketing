import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import type { CreateEventBody } from '@/lib/api/events-organizer';

import { DateTimeField, nextWholeHour } from './date-time-field';

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
  startAt: Date;
  endAt: Date;
  coverImageUrl: string;
  featured: boolean;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

function createEmptyValues(): EventFormValues {
  const startAt = nextWholeHour();

  return {
    title: '',
    description: '',
    venue: '',
    city: '',
    category: 'MUSIC',
    startAt,
    endAt: new Date(startAt.getTime() + ONE_HOUR_MS),
    coverImageUrl: '',
    featured: false,
  };
}

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
  const [values, setValues] = useState<EventFormValues>(() => ({
    ...createEmptyValues(),
    ...initial,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>(
    {},
  );

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setStartAt(startAt: Date) {
    setValues((prev) => ({
      ...prev,
      startAt,
      endAt:
        prev.endAt.getTime() > startAt.getTime()
          ? prev.endAt
          : new Date(startAt.getTime() + ONE_HOUR_MS),
    }));
  }

  function submit() {
    const next: typeof errors = {};
    if (!values.title.trim()) next.title = t('organizer.error.titleRequired');
    if (!values.description.trim())
      next.description = t('organizer.error.descriptionRequired');
    if (!values.venue.trim()) next.venue = t('organizer.error.venueRequired');
    if (!values.city.trim()) next.city = t('organizer.error.cityRequired');

    const startValid = !Number.isNaN(values.startAt.getTime());
    const endValid = !Number.isNaN(values.endAt.getTime());
    if (!startValid) next.startAt = t('organizer.error.startInvalid');
    if (!endValid) next.endAt = t('organizer.error.endInvalid');
    if (startValid && endValid && values.startAt.getTime() >= values.endAt.getTime())
      next.endAt = t('organizer.error.endBeforeStart');

    setErrors(next);
    if (Object.keys(next).length > 0 || !startValid || !endValid) return;

    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      venue: values.venue.trim(),
      city: values.city.trim(),
      category: values.category,
      startAt: values.startAt.toISOString(),
      endAt: values.endAt.toISOString(),
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

      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <DateTimeField
            label={t('organizer.form.startAt')}
            helper={t('organizer.form.dateHint')}
            value={values.startAt}
            onChange={setStartAt}
            error={errors.startAt}
            disabled={submitting}
          />
        </View>
        <View className="min-w-0 flex-1">
          <DateTimeField
            label={t('organizer.form.endAt')}
            helper={t('organizer.form.dateHint')}
            value={values.endAt}
            onChange={(v) => set('endAt', v)}
            error={errors.endAt}
            disabled={submitting}
          />
        </View>
      </View>
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
