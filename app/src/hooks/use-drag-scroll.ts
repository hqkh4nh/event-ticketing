import { useCallback, type RefObject } from 'react';

/**
 * Returns a ref callback for a horizontal scroller, filling `ref` on the way
 * through so callers keep their imperative access to `scrollToOffset`.
 *
 * A no-op on native, where a finger already drags the list. The web build
 * replaces this file with `use-drag-scroll.web.ts`, where a mouse cannot.
 */
export function useDragScroll<T>(ref: RefObject<T | null>) {
  return useCallback(
    (instance: T | null) => {
      ref.current = instance;
    },
    [ref],
  );
}
