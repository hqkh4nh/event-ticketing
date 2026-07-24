import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  /** The face of the ticket, above the tear line. Clipped to the top corners. */
  children: ReactNode;
  /** The stub, below the tear line. */
  stub: ReactNode;
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
export function TicketSurface({ children, stub }: Props) {
  return (
    <View className="rounded-card border border-outline-variant bg-surface-container-lowest">
      <View className="overflow-hidden rounded-t-card">{children}</View>

      {/* No border radius on the tear line: Android skips a dashed border
          whenever the element is rounded. */}
      <View className="relative h-4 flex-row items-center">
        <View className="absolute -left-2 top-0 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
        <View className="mx-3 flex-1 border-t border-dashed border-outline" />
        <View className="absolute -right-2 top-0 h-4 w-4 rounded-full border border-outline-variant bg-surface" />
      </View>

      {stub}
    </View>
  );
}
