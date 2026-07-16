import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useTokens } from '@/hooks/use-tokens';
import { formatDateTime, formatVndAmount } from '@/lib/format';
import { findMockEvent, type TicketTypeSummary } from '@/lib/mock/events';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const event = findMockEvent(id);

  const total = useMemo(() => {
    if (!event) return 0;

    return event.ticketTypes.reduce(
      (sum, ticketType) =>
        sum + ticketType.priceVnd * (quantities[ticketType.id] ?? 0),
      0,
    );
  }, [event, quantities]);

  const selectedCount = Object.values(quantities).reduce((sum, n) => sum + n, 0);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-surface px-container-padding dark:bg-d-surface">
        <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
          {t('event.notFound')}
        </Text>
        <Button variant="outline" label={t('event.back')} onPress={goBack} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface dark:bg-d-surface">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={event.coverImageUrl}
          contentFit="cover"
          transition={200}
          style={{ width: '100%', height: 280 }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('event.back')}
          onPress={goBack}
          className="absolute left-container-padding h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest active:opacity-80 dark:bg-d-surface-container"
          style={{ top: insets.top + 12 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={tokens.onSurface} />
        </Pressable>

        <View className="-mt-6 gap-6 rounded-t-xl bg-surface px-container-padding pb-8 pt-6 dark:bg-d-surface">
          <View className="gap-3">
            <View className="flex-row gap-2">
              <Chip label={t(`event.category.${event.category}`)} />
              {event.featured ? <Chip label={t('event.hot')} tone="secondary" /> : null}
            </View>

            <Text className="font-bold text-[24px] leading-8 text-on-surface dark:text-d-on-surface">
              {event.title}
            </Text>
          </View>

          <View className="gap-4">
            <InfoRow icon="calendar-today" color={tokens.primary}>
              <Text className="font-medium text-[16px] leading-6 text-on-surface dark:text-d-on-surface">
                {formatDateTime(event.startAt)}
              </Text>
              <Text className="font-sans text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
                {t('event.endsAt', { datetime: formatDateTime(event.endAt) })}
              </Text>
            </InfoRow>

            <InfoRow icon="place" color={tokens.primary}>
              <Text className="font-medium text-[16px] leading-6 text-on-surface dark:text-d-on-surface">
                {event.venue}
              </Text>
            </InfoRow>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
              {t('event.about')}
            </Text>
            <Text className="font-sans text-[16px] leading-6 text-on-surface-variant dark:text-d-on-surface-variant">
              {event.description}
            </Text>
          </View>

          <View className="gap-3">
            <Text className="font-semibold text-[20px] leading-7 text-on-surface dark:text-d-on-surface">
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
        </View>
      </ScrollView>

      <View
        className="flex-row items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-lowest px-container-padding pt-4 dark:border-d-outline-variant dark:bg-d-surface-container-lowest"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View>
          <Text className="font-sans text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant">
            {t('event.total')}
          </Text>
          <Text className="font-bold text-[24px] leading-8 text-primary dark:text-d-primary">
            {total === 0 ? t('event.free') : t('event.price', { price: formatVndAmount(total) })}
          </Text>
        </View>

        {/* TODO: create the order (AC-5, AC-6) once POST /api/orders exists. */}
        <Button label={t('event.buy')} disabled={selectedCount === 0} />
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  color,
  children,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded bg-primary/10 dark:bg-d-primary/15">
        <MaterialIcons name={icon} size={20} color={color} />
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
  const { t } = useTranslation();
  const tokens = useTokens();

  const soldOut = ticketType.quantityRemaining === 0;
  const isSelected = quantity > 0;

  return (
    <View
      className={[
        'flex-row items-center justify-between gap-4 rounded-lg border p-4',
        isSelected
          ? 'border-secondary bg-secondary/5'
          : 'border-outline-variant bg-surface-container-lowest dark:border-d-outline-variant dark:bg-d-surface-container',
        soldOut ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-[18px] leading-6 text-on-surface dark:text-d-on-surface">
          {ticketType.name}
        </Text>
        <Text className="font-medium text-[16px] leading-6 text-primary dark:text-d-primary">
          {ticketType.priceVnd === 0
            ? t('event.free')
            : t('event.price', { price: formatVndAmount(ticketType.priceVnd) })}
        </Text>
        <Text className="font-sans text-[12px] leading-4 text-on-surface-variant dark:text-d-on-surface-variant">
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
            color={tokens.onSurface}
          />

          <Text className="min-w-6 text-center font-semibold text-[16px] leading-6 text-on-surface dark:text-d-on-surface">
            {quantity}
          </Text>

          <StepperButton
            icon="add"
            label={t('event.increase', { name: ticketType.name })}
            disabled={quantity >= ticketType.quantityRemaining}
            onPress={() => onChange(quantity + 1)}
            color={tokens.onSurface}
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
  color,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={[
        'h-9 w-9 items-center justify-center rounded-full border border-outline active:scale-95 dark:border-d-outline',
        disabled ? 'opacity-30' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MaterialIcons name={icon} size={18} color={color} />
    </Pressable>
  );
}
