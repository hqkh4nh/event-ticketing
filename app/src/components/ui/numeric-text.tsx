import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  // Proportional figures re-flow the line every time a digit changes, which
  // makes the 15 minute checkout countdown jitter once a second and money
  // totals shift as the quantity steps. Applied as a style because NativeWind
  // does not map the `tabular-nums` utility on native.
  tabular: { fontVariant: ['tabular-nums'] },
});

/** Text for figures the user reads or compares: money, counts, countdowns. */
export function NumericText({
  children,
  className,
  numberOfLines,
}: {
  children: ReactNode;
  className?: string;
  numberOfLines?: number;
}) {
  return (
    <Text style={styles.tabular} className={className} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
