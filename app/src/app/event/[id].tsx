import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { NumericText } from '@/components/ui/numeric-text';
import { DESKTOP_BREAKPOINT } from '@/constants/breakpoints';
import { ApiError } from '@/lib/api/client';
import { toUserMessage } from '@/lib/api/error-message';
import {
  eventsKeys,
  getEvent,
  type EventDetail,
  type TicketTypeSummary,
} from '@/lib/api/events';
import { createOrder, ordersKeys, ticketsKeys } from '@/lib/api/orders';
import { formatDateTime, formatVndAmount } from '@/lib/format';

const PHONE_POSTER_HEIGHT = 280;
const PANEL_WIDTH = 380;

/**
 * `position: sticky` keeps the purchase panel in view while the description
 * scrolls, without taking the page scroll away from the wheel the way a second
 * scroll pane would. It is a web value that React Native's style types do not
 * carry, hence the cast, and it is only ever applied on web.
 */
const STICKY_PANEL = { position: 'sticky', top: 24 } as unknown as ViewStyle;

/** A per-purchase idempotency key so a retried Buy never orders twice. */
function newRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderErrorCode, setOrderErrorCode] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const eventId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const eventQuery = useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    enabled: eventId.length > 0,
  });
  const event = eventQuery.data;

  useEffect(() => {
    setQuantities({});
    setOrderError(null);
    setOrderErrorCode(null);
    requestId.current = null;
  }, [eventId]);

  const orderMutation = useMutation({
    mutationFn: () => {
      requestId.current ??= newRequestId();
      const items = Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
      return createOrder({ eventId, items, clientRequestId: requestId.current });
    },
    onSuccess: (order) => {
      requestId.current = null;
      setOrderErrorCode(null);
      void queryClient.invalidateQueries({ queryKey: ordersKeys.pending() });
      void queryClient.invalidateQueries({ queryKey: ticketsKeys.mine() });
      router.replace({ pathname: '/order/[id]', params: { id: order.id } });
    },
    onError: (error) => {
      setOrderError(toUserMessage(error, t));
      setOrderErrorCode(error instanceof ApiError ? error.code : null);
      // A sold-out race means our remaining counts are stale; pull fresh ones.
      if (error instanceof ApiError && error.code === 'SOLD_OUT') {
        void eventQuery.refetch();
      }
    },
  });

  const total = useMemo(() => {
    if (!event) return 0;

    return event.ticketTypes.reduce(
      (sum, ticketType) => sum + ticketType.priceVnd * (quantities[ticketType.id] ?? 0),
      0,
    );
  }, [event, quantities]);

  const selectedCount = Object.values(quantities).reduce((sum, n) => sum + n, 0);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (eventQuery.isPending && eventId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator className="text-primary" />
      </View>
    );
  }

  const notFound =
    !eventId ||
    (eventQuery.error instanceof ApiError && eventQuery.error.status === 404);

  if (notFound) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-surface px-container-padding">
        <Text className="font-semibold text-headline-md text-on-surface">
          {t('event.notFound')}
        </Text>
        <Button variant="outline" label={t('event.back')} onPress={goBack} />
      </View>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <View className="flex-1 justify-center bg-surface">
        <EmptyState
          icon="cloud-off"
          title={t('event.loadErrorTitle')}
          description={toUserMessage(eventQuery.error, t)}
          action={
            <View className="gap-3">
              <Button
                label={t('common.retry')}
                onPress={() => void eventQuery.refetch()}
              />
              <Button variant="outline" label={t('event.back')} onPress={goBack} />
            </View>
          }
        />
      </View>
    );
  }

  const ticketPicker = (
    <View className="gap-3">
      <Text className="font-semibold text-headline-md text-on-surface">
        {t('event.chooseTickets')}
      </Text>

      {event.ticketTypes.map((ticketType) => (
        <TicketTypeRow
          key={ticketType.id}
          ticketType={ticketType}
          quantity={quantities[ticketType.id] ?? 0}
          onChange={(next) =>
            setQuantities((prev) => ({ ...prev, [ticketType.id]: next }))
          }
        />
      ))}
    </View>
  );

  const orderErrorNotice = orderError ? (
    <View className="gap-2 rounded-md bg-error-container p-3">
      <Text className="font-sans text-label-md text-on-error-container">
        {orderError}
      </Text>
      {orderErrorCode === 'PENDING_ORDER_LIMIT_REACHED' ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-touch-target-min flex-row items-center justify-center gap-2 self-start rounded-full border border-primary px-4 active:bg-primary/10"
          onPress={() => router.replace('/tickets')}
        >
          <MaterialIcons name="schedule" size={20} className="text-primary" />
          <Text className="font-semibold text-label-md text-primary">
            {t('order.viewPendingOrders')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  const totalLine = (
    <View>
      <Text className="font-sans text-label-md text-on-surface-variant">
        {t('event.total')}
      </Text>
      {/* "Free" is a claim about the order, so it may only appear once
          something is actually in it. With nothing selected the total is
          zero, and zero is what it has to say. */}
      <NumericText className="font-bold text-display-sm text-primary">
        {selectedCount > 0 && total === 0
          ? t('event.free')
          : t('event.price', { price: formatVndAmount(total, i18n.language) })}
      </NumericText>
    </View>
  );

  const buyButton = (
    <Button
      label={t('event.buy')}
      loading={orderMutation.isPending}
      disabled={selectedCount === 0}
      onPress={() => {
        setOrderError(null);
        setOrderErrorCode(null);
        orderMutation.mutate();
      }}
    />
  );

  if (isDesktop) {
    return (
      <View className="flex-1 bg-surface">
        <ScrollView
          className="w-full max-w-wide flex-1 self-center"
          contentContainerClassName="px-container-padding pb-12 pt-6 gap-6"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityLabel={t('event.back')}
            accessibilityRole="button"
            className="min-h-touch-target-min flex-row items-center gap-1 self-start rounded-full pr-4 active:bg-surface-container"
            onPress={goBack}
          >
            <MaterialIcons
              name="chevron-left"
              size={24}
              className="text-on-surface-variant"
            />
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('event.back')}
            </Text>
          </Pressable>

          <View className="flex-row items-start gap-8">
            <View className="min-w-0 flex-1 gap-8">
              <View
                className="overflow-hidden rounded-card border border-outline-variant"
                style={{ aspectRatio: 16 / 9 }}
              >
                <EventPoster event={event} />
              </View>

              <View className="gap-4">
                <EventTags event={event} />
                <Text className="font-display text-display-lg text-on-surface">
                  {event.title}
                </Text>
              </View>

              <EventFacts event={event} />

              <View className="gap-3">
                <Text className="font-semibold text-headline-md text-on-surface">
                  {t('event.about')}
                </Text>
                <Text className="font-sans text-body-md text-on-surface-variant">
                  {event.description}
                </Text>
              </View>
            </View>

            <View
              style={[
                { width: PANEL_WIDTH },
                Platform.OS === 'web' ? STICKY_PANEL : null,
              ]}
            >
              <View className="gap-4 rounded-card border border-outline-variant bg-surface-container-lowest p-5">
                {ticketPicker}
                <View className="h-px bg-outline-variant" />
                {orderErrorNotice}
                {totalLine}
                {buyButton}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ height: PHONE_POSTER_HEIGHT }}>
            <EventPoster event={event} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('event.back')}
            onPress={goBack}
            className="absolute left-container-padding h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest active:opacity-80"
            style={{ top: insets.top + 12 }}
          >
            <MaterialIcons name="arrow-back" size={22} className="text-on-surface" />
          </Pressable>

          <View className="-mt-6 gap-6 rounded-t-xl bg-surface px-container-padding pb-8 pt-6">
            <View className="gap-3">
              <EventTags event={event} />
              <Text className="font-display text-display-sm text-on-surface">
                {event.title}
              </Text>
            </View>

            <EventFacts event={event} />

            <View className="gap-3">
              <Text className="font-semibold text-headline-md text-on-surface">
                {t('event.about')}
              </Text>
              <Text className="font-sans text-body-md text-on-surface-variant">
                {event.description}
              </Text>
            </View>

            {ticketPicker}
          </View>
        </ScrollView>

        <View
          className="gap-3 border-t border-outline-variant bg-surface-container-lowest px-container-padding pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {orderErrorNotice}

          <View className="flex-row items-center justify-between gap-4">
            {totalLine}
            {buyButton}
          </View>
        </View>
      </View>
    </View>
  );
}

function EventPoster({ event }: { event: EventDetail }) {
  if (!event.coverImageUrl) {
    return (
      <View className="h-full items-center justify-center bg-surface-container-low">
        <MaterialIcons name="image-not-supported" size={40} className="text-outline" />
      </View>
    );
  }

  return (
    <Image
      source={event.coverImageUrl}
      contentFit="cover"
      transition={200}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function EventTags({ event }: { event: EventDetail }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-2">
      <Chip label={t(`event.category.${event.category}`)} />
      {event.featured ? (
        <Chip label={t('event.hot')} tone="promo" icon="local-fire-department" />
      ) : null}
    </View>
  );
}

function EventFacts({ event }: { event: EventDetail }) {
  const { t, i18n } = useTranslation();

  return (
    <View className="gap-4">
      <InfoRow icon="calendar-today">
        <Text className="font-medium text-body-md text-on-surface">
          {formatDateTime(event.startAt, i18n.language)}
        </Text>
        <Text className="font-sans text-label-md text-on-surface-variant">
          {t('event.endsAt', { datetime: formatDateTime(event.endAt, i18n.language) })}
        </Text>
      </InfoRow>

      <InfoRow icon="place">
        <Text className="font-medium text-body-md text-on-surface">{event.venue}</Text>
      </InfoRow>
    </View>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded bg-primary/10">
        <MaterialIcons name={icon} size={20} className="text-primary" />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}

function TicketTypeRow({
  ticketType,
  quantity,
  onChange,
}: {
  ticketType: TicketTypeSummary;
  quantity: number;
  onChange: (next: number) => void;
}) {
  const { t, i18n } = useTranslation();

  const soldOut = ticketType.quantityRemaining === 0;
  const isSelected = quantity > 0;

  return (
    <View
      className={[
        'flex-row items-center justify-between gap-4 rounded-lg border p-4',
        // Selection is a primary action, so it wears the primary colour. This
        // row used to turn crimson when picked, which set the secondary colour
        // up as a rival accent on the one screen that sells the ticket.
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-outline-variant bg-surface-container-lowest',
        soldOut ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-semibold text-body-lg text-on-surface">{ticketType.name}</Text>

        <NumericText className="font-medium text-body-md text-primary">
          {ticketType.priceVnd === 0
            ? t('event.free')
            : t('event.price', { price: formatVndAmount(ticketType.priceVnd, i18n.language) })}
        </NumericText>

        <Text className="font-sans text-label-sm text-on-surface-variant">
          {soldOut
            ? t('event.soldOut')
            : t('event.remaining', { remaining: ticketType.quantityRemaining })}
        </Text>
      </View>

      {soldOut ? null : (
        <View className="flex-row items-center gap-3">
          <StepperButton
            icon="remove"
            label={t('event.decrease', { name: ticketType.name })}
            disabled={quantity === 0}
            onPress={() => onChange(quantity - 1)}
          />

          <NumericText className="min-w-6 text-center font-semibold text-body-md text-on-surface">
            {quantity}
          </NumericText>

          <StepperButton
            icon="add"
            label={t('event.increase', { name: ticketType.name })}
            disabled={quantity >= ticketType.quantityRemaining}
            onPress={() => onChange(quantity + 1)}
          />
        </View>
      )}
    </View>
  );
}

function StepperButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      // Drawn at 36px so the two steppers and the count still fit beside the
      // ticket name, but padded out to the 48px target DESIGN.md requires.
      hitSlop={6}
      className={[
        'h-9 w-9 items-center justify-center rounded-full border border-outline active:scale-95',
        disabled ? 'opacity-30' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MaterialIcons name={icon} size={18} className="text-on-surface" />
    </Pressable>
  );
}
