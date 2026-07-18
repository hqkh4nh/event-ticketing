import { MaterialIcons } from '@expo/vector-icons';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventForm, isoToLocalInput } from '@/components/organizer/event-form';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import {
  addTicketType,
  cancelEvent,
  deleteEvent,
  deleteTicketType,
  getMyEvent,
  publishEvent,
  unpublishEvent,
  updateEvent,
  type CreateEventBody,
  type OrganizerEvent,
} from '@/lib/api/events-organizer';
import { toUserMessage } from '@/lib/api/error-message';
import { formatVndAmount } from '@/lib/format';

export default function EditEventScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'delete' | 'cancel' | null>(null);

  const eventKey = ['organizer', 'events', id] as const;
  const { data: event, isLoading } = useQuery({
    queryKey: eventKey,
    queryFn: () => getMyEvent(id),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['organizer', 'events'] });
  }

  const update = useMutation({
    mutationFn: (body: CreateEventBody) => updateEvent(id, body),
    onSuccess: () => invalidate(),
    onError: (err) => setActionError(toUserMessage(err, t)),
  });

  const publish = useMutation({
    mutationFn: () => publishEvent(id),
    onSuccess: () => invalidate(),
    onError: (err) => setActionError(toUserMessage(err, t)),
  });
  const unpublish = useMutation({
    mutationFn: () => unpublishEvent(id),
    onSuccess: () => invalidate(),
    onError: (err) => setActionError(toUserMessage(err, t)),
  });
  const cancel = useMutation({
    mutationFn: () => cancelEvent(id),
    onSuccess: () => {
      setConfirming(null);
      invalidate();
    },
    onError: (err) => setActionError(toUserMessage(err, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      invalidate();
      router.replace('/organizer');
    },
    onError: (err) => setActionError(toUserMessage(err, t)),
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator className="text-primary" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface px-container-padding">
        <Text className="font-semibold text-body-md text-on-surface">
          {t('api.error.NOT_FOUND')}
        </Text>
        <Button label={t('event.back')} onPress={() => router.replace('/organizer')} />
      </SafeAreaView>
    );
  }

  const busy =
    publish.isPending ||
    unpublish.isPending ||
    cancel.isPending ||
    remove.isPending;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-container-padding py-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-content self-center gap-6">
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                className="active:opacity-60"
              >
                <MaterialIcons name="arrow-back" size={24} className="text-on-surface" />
              </Pressable>
              <Text
                numberOfLines={1}
                className="flex-1 font-bold text-headline-md text-on-surface"
              >
                {t('organizer.form.editTitle')}
              </Text>
              <Chip
                label={t(`organizer.status.${event.status}`)}
                tone={event.status === 'PUBLISHED' ? 'primary' : 'neutral'}
              />
            </View>

            {actionError ? (
              <View className="rounded-md bg-error-container px-4 py-3">
                <Text className="font-sans text-label-md text-on-error-container">
                  {actionError}
                </Text>
              </View>
            ) : null}

            <EventForm
              initial={{
                title: event.title,
                description: event.description,
                venue: event.venue,
                city: event.city,
                category: event.category,
                startAt: isoToLocalInput(event.startAt),
                endAt: isoToLocalInput(event.endAt),
                coverImageUrl: event.coverImageUrl ?? '',
                featured: event.featured,
              }}
              submitLabel={t('organizer.form.save')}
              submitting={update.isPending}
              onSubmit={(body) => {
                setActionError(null);
                update.mutate(body);
              }}
            />

            <TicketTypesSection
              event={event}
              locale={i18n.language}
              onError={setActionError}
            />

            <View className="gap-3 border-t border-outline-variant pt-6">
              {event.status === 'DRAFT' ? (
                <Button
                  label={t('organizer.actions.publish')}
                  loading={publish.isPending}
                  disabled={busy}
                  onPress={() => {
                    setActionError(null);
                    publish.mutate();
                  }}
                />
              ) : null}

              {event.status === 'PUBLISHED' ? (
                <Button
                  variant="outline"
                  label={t('organizer.actions.unpublish')}
                  loading={unpublish.isPending}
                  disabled={busy}
                  onPress={() => {
                    setActionError(null);
                    unpublish.mutate();
                  }}
                />
              ) : null}

              {confirming ? (
                <View className="gap-3 rounded-md bg-surface-container px-4 py-4">
                  <Text className="font-semibold text-body-md text-on-surface">
                    {t(
                      confirming === 'delete'
                        ? 'organizer.actions.confirmDeleteTitle'
                        : 'organizer.actions.confirmCancelTitle',
                    )}
                  </Text>
                  <Text className="font-sans text-label-md text-on-surface-variant">
                    {t(
                      confirming === 'delete'
                        ? 'organizer.actions.confirmDeleteBody'
                        : 'organizer.actions.confirmCancelBody',
                    )}
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Button
                        variant="outline"
                        label={t('organizer.actions.dismiss')}
                        disabled={busy}
                        onPress={() => setConfirming(null)}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label={t('organizer.actions.confirm')}
                        loading={busy}
                        onPress={() => {
                          setActionError(null);
                          if (confirming === 'delete') remove.mutate();
                          else cancel.mutate();
                        }}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  {event.status === 'PUBLISHED' ? (
                    <View className="flex-1">
                      <Button
                        variant="outline"
                        label={t('organizer.actions.cancel')}
                        disabled={busy}
                        onPress={() => setConfirming('cancel')}
                      />
                    </View>
                  ) : null}
                  {event.status === 'DRAFT' ? (
                    <View className="flex-1">
                      <Button
                        variant="outline"
                        label={t('organizer.actions.delete')}
                        disabled={busy}
                        onPress={() => setConfirming('delete')}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TicketTypesSection({
  event,
  locale,
  onError,
}: {
  event: OrganizerEvent;
  locale: string;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const eventKey = ['organizer', 'events', event.id];

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    quantity?: string;
  }>({});

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: eventKey });
  }

  const add = useMutation({
    mutationFn: () =>
      addTicketType(event.id, {
        name: name.trim(),
        priceVnd: Number(price),
        quantityTotal: Number(quantity),
      }),
    onSuccess: () => {
      setName('');
      setPrice('');
      setQuantity('');
      invalidate();
    },
    onError: (err) => onError(toUserMessage(err, t)),
  });

  const removeType = useMutation({
    mutationFn: (ticketTypeId: string) =>
      deleteTicketType(event.id, ticketTypeId),
    onSuccess: () => invalidate(),
    onError: (err) => onError(toUserMessage(err, t)),
  });

  function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('organizer.error.ticketNameRequired');
    const priceNum = Number(price);
    if (price.trim() === '' || !Number.isInteger(priceNum) || priceNum < 0)
      next.price = t('organizer.error.priceInvalid');
    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 1)
      next.quantity = t('organizer.error.quantityInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    add.mutate();
  }

  return (
    <View className="gap-3 border-t border-outline-variant pt-6">
      <Text className="font-semibold text-headline-md text-on-surface">
        {t('organizer.ticketTypes.heading')}
      </Text>

      {event.ticketTypes.length === 0 ? (
        <Text className="font-sans text-label-md text-on-surface-variant">
          {t('organizer.ticketTypes.empty')}
        </Text>
      ) : (
        <View className="gap-2">
          {event.ticketTypes.map((tt) => (
            <View
              key={tt.id}
              className="flex-row items-center gap-3 rounded-md bg-surface-container px-4 py-3"
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold text-body-md text-on-surface">
                  {tt.name}
                </Text>
                <Text className="font-sans text-label-md text-on-surface-variant">
                  {tt.priceVnd === 0
                    ? t('organizer.ticketTypes.free')
                    : `${formatVndAmount(tt.priceVnd, locale)}₫`}{' '}
                  ·{' '}
                  {t('organizer.ticketTypes.soldSuffix', {
                    sold: tt.soldCount,
                    total: tt.quantityTotal,
                  })}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('organizer.ticketTypes.remove')}
                disabled={removeType.isPending}
                onPress={() => removeType.mutate(tt.id)}
                className="active:opacity-60"
              >
                <MaterialIcons name="delete-outline" size={22} className="text-error" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="gap-3 rounded-md border border-outline-variant p-4">
        <TextField
          label={t('organizer.ticketTypes.name')}
          placeholder={t('organizer.ticketTypes.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label={t('organizer.ticketTypes.price')}
              placeholder="0"
              helper={t('organizer.ticketTypes.priceHint')}
              value={price}
              onChangeText={setPrice}
              error={errors.price}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <TextField
              label={t('organizer.ticketTypes.quantity')}
              placeholder="100"
              value={quantity}
              onChangeText={setQuantity}
              error={errors.quantity}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Button
          variant="outline"
          label={t('organizer.ticketTypes.add')}
          loading={add.isPending}
          onPress={submit}
        />
      </View>
    </View>
  );
}
