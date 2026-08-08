import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CarouselArrow } from '@/components/ui/carousel-arrow';
import { WIDE_BREAKPOINT } from '@/constants/breakpoints';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import type { EventSummary } from '@/lib/api/events';

import { FeaturedEventCard } from './featured-event-card';
import { FeaturedEventHero } from './featured-event-hero';

/** Long enough to read a title before the slide moves on. */
const AUTOPLAY_INTERVAL_MS = 7_000;
const INTERACTION_SETTLE_MS = 250;
const MAX_CARD_WIDTH = 560;
const MAX_HERO_WIDTH = 1160;
const POSTER_ASPECT_RATIO = 4 / 3;
/** Hero height as a share of its width, tuned so a 1160px slide lands at 400px. */
const HERO_HEIGHT_RATIO = 0.345;
/** The stub needs ~284px for its chip, three title lines, date, price and link. */
const MIN_HERO_HEIGHT = 300;
const MIN_STUB_WIDTH = 280;
const MAX_STUB_WIDTH = 400;
const DOT_HIT_SLOP = { top: 16, bottom: 16, left: 6, right: 6 } as const;

export function FeaturedEventCarousel({ events }: { events: EventSummary[] }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<EventSummary>>(null);
  const attachList = useDragScroll(listRef);
  const indexRef = useRef(0);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const eventIdsKey = events.map((event) => event.id).join(',');
  const safeActiveIndex = Math.min(activeIndex, Math.max(events.length - 1, 0));

  const isWide = width >= WIDE_BREAKPOINT;
  const cardWidth = Math.min(slideWidth, MAX_CARD_WIDTH);
  const posterHeight = cardWidth / POSTER_ASPECT_RATIO;
  const heroHeight = Math.max(
    MIN_HERO_HEIGHT,
    Math.round(Math.min(slideWidth, MAX_HERO_WIDTH) * HERO_HEIGHT_RATIO),
  );
  const stubWidth = Math.round(
    Math.min(MAX_STUB_WIDTH, Math.max(MIN_STUB_WIDTH, slideWidth * 0.32)),
  );

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
    indexRef.current = 0;
    setActiveIndex(0);
    setIsInteracting(false);
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [eventIdsKey]);

  useEffect(
    () => () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (
      events.length <= 1 ||
      slideWidth <= 0 ||
      isInteracting ||
      isHovered ||
      reduceMotion
    ) {
      return;
    }

    const interval = setInterval(() => {
      // Read the index off the ref rather than state: `onScroll` owns
      // `activeIndex` and keeps rewriting it while a slide animates.
      const next = (indexRef.current + 1) % events.length;
      indexRef.current = next;
      listRef.current?.scrollToOffset({
        animated: true,
        offset: next * slideWidth,
      });
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [events.length, isHovered, isInteracting, reduceMotion, slideWidth]);

  function beginInteraction() {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setIsInteracting(true);
  }

  /**
   * A drag can end with or without momentum, so both endings settle through the
   * same delay rather than resuming autoplay the instant a finger lifts.
   */
  function finishInteractionSoon() {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(
      () => setIsInteracting(false),
      INTERACTION_SETTLE_MS,
    );
  }

  function goTo(index: number) {
    const target = Math.max(0, Math.min(index, events.length - 1));
    indexRef.current = target;
    setActiveIndex(target);
    listRef.current?.scrollToOffset({
      animated: true,
      offset: target * slideWidth,
    });
  }

  /**
   * The only scroll event react-native-web emits. `onMomentumScrollEnd` and the
   * drag callbacks never fire there, so the dots have to read the offset
   * directly or they freeze on the first slide for every web visitor.
   */
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (slideWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    const settled = Math.max(0, Math.min(index, events.length - 1));
    indexRef.current = settled;
    setActiveIndex(settled);
  }

  return (
    <View
      accessibilityLabel={t('home.featuredCarousel', { count: events.length })}
      className="gap-3"
      onLayout={(event) => setSlideWidth(event.nativeEvent.layout.width)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {slideWidth > 0 ? (
        <FlatList
          key={eventIdsKey}
          ref={attachList}
          horizontal
          pagingEnabled
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: slideWidth, alignItems: 'center' }}>
              {isWide ? (
                <FeaturedEventHero
                  event={item}
                  height={heroHeight}
                  stubWidth={stubWidth}
                />
              ) : (
                <View style={{ width: cardWidth }}>
                  <FeaturedEventCard
                    event={item}
                    fullWidth
                    posterHeight={posterHeight}
                  />
                </View>
              )}
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
          onScrollBeginDrag={beginInteraction}
          onScrollEndDrag={finishInteractionSoon}
          onMomentumScrollBegin={beginInteraction}
          onMomentumScrollEnd={finishInteractionSoon}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}

      {events.length > 1 ? (
        <View className="min-h-touch-target-min flex-row items-center justify-center gap-4">
          {isWide ? (
            <CarouselArrow
              direction="previous"
              disabled={safeActiveIndex === 0}
              onPress={() => goTo(safeActiveIndex - 1)}
            />
          ) : null}

          <View
            accessibilityLabel={t('home.featuredSlide', {
              current: safeActiveIndex + 1,
              total: events.length,
            })}
            className="flex-row items-center gap-3"
          >
            {events.map((event, index) => (
              <Pressable
                key={event.id}
                accessibilityLabel={t('home.goToSlide', { index: index + 1 })}
                accessibilityRole="button"
                accessibilityState={{ selected: index === safeActiveIndex }}
                // Drawn at 8px but padded out to a real target. The sideways
                // slop stops at half the gap: any wider and neighbouring dots
                // would share hit area, so a press between two would land on
                // whichever one happens to be on top.
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
              disabled={safeActiveIndex === events.length - 1}
              onPress={() => goTo(safeActiveIndex + 1)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
