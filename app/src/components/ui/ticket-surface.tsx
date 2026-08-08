import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  /** The face of the ticket, on the near side of the tear line. */
  children: ReactNode;
  /** The stub, on the far side of the tear line. */
  stub: ReactNode;
  /**
   * Which way the tear runs. `horizontal` stacks the stub under the face, the
   * only shape a phone has room for. `vertical` puts the stub beside it, which
   * is how a ticket actually tears; use it once the card is wider than tall.
   * In `vertical` the face takes the remaining width, so size the stub node.
   */
  orientation?: 'horizontal' | 'vertical';
};

/**
 * A card shaped like a physical ticket: a face, a tear line notched into both
 * edges, and a stub. Part of the language taken from the eTicket logo mark
 * (ref/logo/08-mark-notch.svg).
 *
 * The notches are circles filled with the page colour and outlined with a
 * hairline, hung half over each edge at the tear line. The fill carries the bite
 * where page and card differ (dark mode); the hairline keeps it legible on
 * Paper, where `surface` and `surface-container-lowest` sit close.
 */
export function TicketSurface({ children, stub, orientation = 'horizontal' }: Props) {
  if (orientation === 'vertical') {
    return (
      // No `overflow-hidden` on the card itself: it would clip the notches,
      // which are meant to hang half outside the top and bottom edges.
      <View className="flex-row rounded-card border border-outline-variant bg-surface-container-lowest">
        <View className="min-w-0 flex-1 overflow-hidden rounded-l-card">{children}</View>

        {/* No border radius on the tear line: Android skips a dashed border
            whenever the element is rounded. */}
        <View className="relative w-4 items-center">
          <View className="absolute -top-2 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
          <View className="my-3 flex-1 border-l border-dashed border-outline" />
          <View className="absolute -bottom-2 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
        </View>

        {stub}
      </View>
    );
  }

  return (
    <View className="rounded-card border border-outline-variant bg-surface-container-lowest">
      <View className="overflow-hidden rounded-t-card">{children}</View>

      <View className="relative h-4 flex-row items-center">
        <View className="absolute -left-2 top-0 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
        <View className="mx-3 flex-1 border-t border-dashed border-outline" />
        <View className="absolute -right-2 top-0 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
      </View>

      {stub}
    </View>
  );
}
