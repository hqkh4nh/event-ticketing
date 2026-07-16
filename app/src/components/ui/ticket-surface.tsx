import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  /** The face of the ticket, above the tear line. Clipped to the top corners. */
  children: ReactNode;
  /** The stub, below the tear line. */
  stub: ReactNode;
};

/**
 * A card shaped like a physical ticket: a face, a tear line, and a stub. Part
 * of the language taken from the eTicket logo mark (ref/logo/08-mark-notch.svg).
 *
 * The mark's side notches are deliberately not reproduced here. A notch drawn
 * as a background-coloured circle hung over the edge only reads as a bite when
 * the page and the card differ; `surface` (#f8f9ff) and
 * `surface-container-lowest` (#ffffff) are three values apart, so the circle
 * disappeared and all that remained was a chunk missing from the border, which
 * looked like a rendering fault. Cutting a true notch out of a bordered box
 * needs the whole silhouette drawn as an SVG path, which is not worth its cost
 * while the perforation already carries the metaphor. The notch stays in the
 * logo, where a mask renders it correctly.
 */
export function TicketSurface({ children, stub }: Props) {
  return (
    <View className="rounded-lg border border-outline-variant bg-surface-container-lowest">
      <View className="overflow-hidden rounded-t-lg">{children}</View>

      {/* No border radius on the tear line: Android skips a dashed border
          whenever the element is rounded. */}
      <View className="h-4 flex-row items-center">
        <View className="mx-3 flex-1 border-t border-dashed border-outline-variant" />
      </View>

      {stub}
    </View>
  );
}
