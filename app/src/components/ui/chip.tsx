import { Text, View } from 'react-native';

type Props = {
  label: string;
  tone?: 'primary' | 'secondary';
  /** `tonal` tints the background; `filled` uses the solid brand colour. */
  variant?: 'tonal' | 'filled';
};

const TONAL: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary/10 dark:bg-d-primary/15',
  secondary: 'bg-secondary/10 dark:bg-secondary-container/15',
};

const TONAL_TEXT: Record<NonNullable<Props['tone']>, string> = {
  primary: 'text-primary dark:text-d-primary',
  secondary: 'text-secondary dark:text-secondary-container',
};

const FILLED: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary dark:bg-d-primary',
  secondary: 'bg-secondary',
};

const FILLED_TEXT: Record<NonNullable<Props['tone']>, string> = {
  primary: 'text-on-primary dark:text-d-on-primary',
  secondary: 'text-on-secondary',
};

/** Small status or category label. See DESIGN.md, "Chips". */
export function Chip({ label, tone = 'primary', variant = 'tonal' }: Props) {
  const isFilled = variant === 'filled';

  return (
    <View
      className={[
        'self-start rounded px-2 py-1',
        isFilled ? FILLED[tone] : TONAL[tone],
      ].join(' ')}
    >
      <Text
        className={[
          'font-medium text-[12px] leading-4',
          isFilled ? FILLED_TEXT[tone] : TONAL_TEXT[tone],
        ].join(' ')}
      >
        {label}
      </Text>
    </View>
  );
}
