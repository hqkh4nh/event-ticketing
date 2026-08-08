import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CarouselArrow } from '@/components/ui/carousel-arrow';
import { WIDE_BREAKPOINT } from '@/constants/breakpoints';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import type { OrderResponse } from '@/lib/api/orders';

import { PendingOrderCard } from './pending-order-card';

/** Sideways slop stops at half the gap so neighbouring dots never share hit area. */
const DOT_HIT_SLOP = { top: 16, bottom: 16, left: 6, right: 6 } as const;

type PendingOrderCarouselProps = {
  orders: OrderResponse[];
  now: number;
  onContinue: (order: OrderResponse) => void;
  onCancel: (order: OrderResponse) => void;
};

export function PendingOrderCarousel({
  orders,
  now,
  onContinue,
  onCancel,
}: PendingOrderCarouselProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OrderResponse>>(null);
  const attachList = useDragScroll(listRef);
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const isWide = width >= WIDE_BREAKPOINT;
  const safeActiveIndex = Math.min(activeIndex, Math.max(orders.length - 1, 0));

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(orders.length - 1, 0)),
    );
  }, [orders.length]);

  function goTo(index: number) {
    const target = Math.max(0, Math.min(index, orders.length - 1));
    setActiveIndex(target);
    listRef.current?.scrollToOffset({
      animated: true,
      offset: target * slideWidth,
    });
  }

  /**
   * The only scroll event react-native-web emits. Reading the offset here
   * rather than from `onMomentumScrollEnd` is what keeps the dots alive on web.
   */
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (slideWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(index, orders.length - 1)));
  }

  return (
    <View className="gap-3">
      <Text className="font-semibold text-body-lg text-on-surface">
        {t('tickets.pending.title')}
      </Text>

      <View onLayout={(event) => setSlideWidth(event.nativeEvent.layout.width)}>
        {slideWidth > 0 ? (
          <FlatList
            ref={attachList}
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
                  onCancel={() => onCancel(item)}
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              index,
              length: slideWidth,
              offset: slideWidth * index,
            })}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
          />
        ) : null}
      </View>

      {orders.length > 1 ? (
        <View className="min-h-touch-target-min flex-row items-center justify-center gap-4">
          {isWide ? (
            <CarouselArrow
              direction="previous"
              disabled={safeActiveIndex === 0}
              onPress={() => goTo(safeActiveIndex - 1)}
            />
          ) : null}

          <View className="flex-row items-center gap-3">
            {orders.map((order, index) => (
              <Pressable
                key={order.id}
                accessibilityLabel={t('tickets.pending.goToOrder', {
                  index: index + 1,
                })}
                accessibilityRole="button"
                accessibilityState={{ selected: index === safeActiveIndex }}
                hitSlop={DOT_HIT_SLOP}
                onPress={() => goTo(index)}
              >
                <View
                  className={[
                    'h-2 rounded-full',
                    index === safeActiveIndex
                      ? 'w-5 bg-primary'
                      : 'w-2 bg-outline-variant',
                  ].join(' ')}
                />
              </Pressable>
            ))}
          </View>

          {isWide ? (
            <CarouselArrow
              direction="next"
              disabled={safeActiveIndex === orders.length - 1}
              onPress={() => goTo(safeActiveIndex + 1)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
