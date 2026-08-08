import { useCallback, useRef, type RefObject } from 'react';

/** How far a mouse must travel before the release counts as a drag, not a click. */
const DRAG_THRESHOLD_PX = 6;

type ScrollableHost = { getScrollableNode?: () => unknown };

/**
 * Lets a mouse drag a horizontal scroller.
 *
 * react-native-web renders a horizontal list as an `overflow-x: scroll` div,
 * which a mouse has no way to pan: a vertical wheel is ignored and there is no
 * drag gesture. Without this the content is unreachable to anyone without a
 * trackpad or the habit of holding shift while scrolling.
 *
 * Returns a ref callback that fills `ref` on the way through, so callers keep
 * their imperative access to `scrollToOffset`.
 */
export function useDragScroll<T>(ref: RefObject<T | null>) {
  const detach = useRef<(() => void) | null>(null);

  return useCallback(
    (instance: T | null) => {
      ref.current = instance;
      detach.current?.();
      detach.current = null;
      if (!instance) return;

      const node = (instance as ScrollableHost).getScrollableNode?.() as
        | HTMLElement
        | null
        | undefined;
      if (!node) return;

      let startX = 0;
      let startScrollLeft = 0;
      let travelled = 0;
      let isDragging = false;
      let restoreSnapType = '';

      const swallowClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
      };

      const onPointerMove = (event: PointerEvent) => {
        const delta = event.clientX - startX;
        travelled = Math.max(travelled, Math.abs(delta));
        node.scrollLeft = startScrollLeft - delta;
      };

      const onPointerUp = () => {
        const wasDrag = isDragging && travelled > DRAG_THRESHOLD_PX;
        stopDrag();
        if (!wasDrag) return;

        // The browser fires `click` immediately after `pointerup`, so a drag
        // that ends over a card would also open it. One capture-phase listener
        // eats that click; the timeout clears it again when the release landed
        // on nothing clickable and no click ever came.
        node.addEventListener('click', swallowClick, true);
        window.setTimeout(
          () => node.removeEventListener('click', swallowClick, true),
          0,
        );
      };

      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', stopDrag);
        node.style.cursor = 'grab';
        node.style.userSelect = '';
        node.style.scrollSnapType = restoreSnapType;
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        isDragging = true;
        travelled = 0;
        startX = event.clientX;
        startScrollLeft = node.scrollLeft;
        // `pagingEnabled` compiles to `scroll-snap-type: x mandatory`, which
        // re-snaps on every scrollLeft written here and turns the drag into a
        // stutter. It goes back on release, so the slide still lands on a page.
        restoreSnapType = node.style.scrollSnapType;
        node.style.cursor = 'grabbing';
        node.style.userSelect = 'none';
        node.style.scrollSnapType = 'none';
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', stopDrag);
      };

      // Posters are real <img> elements, so without this the browser starts its
      // own drag-and-drop as soon as the pointer moves and cancels ours.
      const preventNativeDrag = (event: Event) => event.preventDefault();

      node.style.cursor = 'grab';
      node.addEventListener('pointerdown', onPointerDown);
      node.addEventListener('dragstart', preventNativeDrag);

      detach.current = () => {
        stopDrag();
        node.removeEventListener('pointerdown', onPointerDown);
        node.removeEventListener('dragstart', preventNativeDrag);
        node.style.cursor = '';
      };
    },
    [ref],
  );
}
