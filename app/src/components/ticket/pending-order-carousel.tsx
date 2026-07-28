import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  View,
} from 'react-native';

import type { OrderResponse } from '@/lib/api/orders';

import { PendingOrderCard } from './pending-order-card';

type PendingOrderCarouselProps = {
  orders: OrderResponse[];
  now: number;
  onContinue: (order: OrderResponse) => void;
};

export function PendingOrderCarousel({
  orders,
  now,
  onContinue,
}: PendingOrderCarouselProps) {
  const { t } = useTranslation();
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(orders.length - 1, 0)),
    );
  }, [orders.length]);

  function finishMomentum(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const nextIndex =
      slideWidth > 0
        ? Math.round(event.nativeEvent.contentOffset.x / slideWidth)
        : 0;
    setActiveIndex(Math.min(Math.max(nextIndex, 0), orders.length - 1));
  }

  return (
    <View className="gap-3">
      <Text className="font-semibold text-body-lg text-on-surface">
        {t('tickets.pending.title')}
      </Text>

      <View onLayout={(event) => setSlideWidth(event.nativeEvent.layout.width)}>
        {slideWidth > 0 ? (
          <FlatList
            horizontal
            pagingEnabled
            scrollEnabled={orders.length > 1}
            data={orders}
            keyExtractor={(order) => order.id}
            renderItem={({ item }) => (
              <View style={{ width: slideWidth }}>
                <PendingOrderCard
                  order={item}
                  remainingMs={
                    new Date(item.payment?.expiresAt ?? 0).getTime() - now
                  }
                  onContinue={() => onContinue(item)}
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              index,
              length: slideWidth,
              offset: slideWidth * index,
            })}
            decelerationRate="fast"
            onMomentumScrollEnd={finishMomentum}
            showsHorizontalScrollIndicator={false}
          />
        ) : null}
      </View>

      {orders.length > 1 ? (
        <View className="h-2 flex-row items-center justify-center gap-2">
          {orders.map((order, index) => (
            <View
              key={order.id}
              className={[
                'h-2 rounded-full',
                index === activeIndex
                  ? 'w-5 bg-primary'
                  : 'w-2 bg-outline-variant',
              ].join(' ')}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
