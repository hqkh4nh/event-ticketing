import { useRef, useState } from 'react';
import {
  FlatList,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CarouselArrow } from '@/components/ui/carousel-arrow';
import { WIDE_BREAKPOINT } from '@/constants/breakpoints';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import type { EventSummary } from '@/lib/api/events';

import { CompactEventCard } from './compact-event-card';
import { DiscoverySection } from './discovery-section';

const CONTENT_STYLE = { gap: 12, paddingRight: 20 } as const;
/** How much of the rail a single step moves, leaving a card in view as an anchor. */
const STEP_RATIO = 0.8;
/** Sub-pixel scroll offsets are normal, so the ends need a little tolerance. */
const EDGE_TOLERANCE_PX = 2;

type EventShelfProps = {
  events: EventSummary[];
  title: string;
  actionLabel: string;
  actionAccessibilityLabel: string;
  onPressAction: () => void;
};

/** A horizontal rail of events, steppable by arrow and draggable by mouse. */
export function EventShelf({
  events,
  title,
  actionLabel,
  actionAccessibilityLabel,
  onPressAction,
}: EventShelfProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<EventSummary>>(null);
  const attachList = useDragScroll(listRef);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const overflows = maxOffset > EDGE_TOLERANCE_PX;
  // Arrows are for pointers. A touch device drags the rail directly and does
  // not need a second way to do it taking up header space.
  const showArrows = width >= WIDE_BREAKPOINT && overflows;

  function step(direction: -1 | 1) {
    const next = Math.max(
      0,
      Math.min(maxOffset, offset + direction * viewportWidth * STEP_RATIO),
    );
    listRef.current?.scrollToOffset({ animated: true, offset: next });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setOffset(event.nativeEvent.contentOffset.x);
  }

  return (
    <DiscoverySection
      actionAccessibilityLabel={actionAccessibilityLabel}
      actionLabel={actionLabel}
      controls={
        showArrows ? (
          <View className="flex-row items-center gap-2">
            <CarouselArrow
              direction="previous"
              disabled={offset <= EDGE_TOLERANCE_PX}
              onPress={() => step(-1)}
            />
            <CarouselArrow
              direction="next"
              disabled={offset >= maxOffset - EDGE_TOLERANCE_PX}
              onPress={() => step(1)}
            />
          </View>
        ) : null
      }
      onPressAction={onPressAction}
      title={title}
    >
      <FlatList
        ref={attachList}
        horizontal
        contentContainerStyle={CONTENT_STYLE}
        data={events}
        keyExtractor={(event) => event.id}
        onContentSizeChange={(nextWidth) => setContentWidth(nextWidth)}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onScroll={handleScroll}
        renderItem={({ item }) => <CompactEventCard event={item} />}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      />
    </DiscoverySection>
  );
}
