import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';

import type { EventSummary } from '@/lib/api/events';

import { FeaturedEventCard } from './featured-event-card';

const AUTOPLAY_INTERVAL_MS = 2_000;
const INTERACTION_SETTLE_MS = 250;
const MAX_CARD_WIDTH = 560;
const POSTER_ASPECT_RATIO = 4 / 3;

export function FeaturedEventCarousel({
  events,
}: {
  events: EventSummary[];
}) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<EventSummary>>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const eventIdsKey = events.map((event) => event.id).join(',');
  const safeActiveIndex = Math.min(activeIndex, Math.max(events.length - 1, 0));
  const cardWidth = Math.min(slideWidth, MAX_CARD_WIDTH);
  const posterHeight = cardWidth / POSTER_ASPECT_RATIO;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setActiveIndex(0);
    setIsInteracting(false);
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [eventIdsKey]);

  useEffect(() => {
    if (
      events.length <= 1 ||
      slideWidth <= 0 ||
      isInteracting ||
      reduceMotion
    ) {
      return;
    }

    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const currentIndex = Math.min(current, events.length - 1);
        const next = (currentIndex + 1) % events.length;
        listRef.current?.scrollToOffset({
          animated: true,
          offset: next * slideWidth,
        });
        return next;
      });
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [events.length, isInteracting, reduceMotion, slideWidth]);

  useEffect(
    () => () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    },
    [],
  );

  function beginInteraction() {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setIsInteracting(true);
  }

  function finishInteractionSoon() {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(
      () => setIsInteracting(false),
      INTERACTION_SETTLE_MS,
    );
  }

  function finishMomentum(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    const nextIndex =
      slideWidth > 0
        ? Math.round(event.nativeEvent.contentOffset.x / slideWidth)
        : 0;
    setActiveIndex(Math.max(0, Math.min(nextIndex, events.length - 1)));
    setIsInteracting(false);
  }

  return (
    <View
      accessibilityLabel={t('home.featuredCarousel', {
        count: events.length,
      })}
      className="gap-3"
      onLayout={(event) => setSlideWidth(event.nativeEvent.layout.width)}
    >
      {slideWidth > 0 ? (
        <FlatList
          key={eventIdsKey}
          ref={listRef}
          horizontal
          pagingEnabled
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: slideWidth, alignItems: 'center' }}>
              <View style={{ width: cardWidth }}>
                <FeaturedEventCard
                  event={item}
                  fullWidth
                  posterHeight={posterHeight}
                />
              </View>
            </View>
          )}
          getItemLayout={(_, index) => ({
            index,
            length: slideWidth,
            offset: slideWidth * index,
          })}
          decelerationRate="fast"
          onScrollBeginDrag={beginInteraction}
          onScrollEndDrag={finishInteractionSoon}
          onMomentumScrollBegin={beginInteraction}
          onMomentumScrollEnd={finishMomentum}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}

      {events.length > 1 ? (
        <View
          accessibilityLabel={t('home.featuredSlide', {
            current: safeActiveIndex + 1,
            total: events.length,
          })}
          className="h-2 flex-row items-center justify-center gap-2"
        >
          {events.map((event, index) => (
            <View
              key={event.id}
              className={[
                'h-2 rounded-full',
                index === safeActiveIndex
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
