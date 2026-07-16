import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  label: string;
  /**
   * `promo` is the only place the secondary colour is allowed to appear. Teal
   * is the single accent; a second competing accent on ordinary labels is what
   * made the reference screens read as generic.
   */
  tone?: 'neutral' | 'primary' | 'promo';
  icon?: keyof typeof MaterialIcons.glyphMap;
};

const SURFACE: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-surface-container',
  primary: 'bg-primary/10',
  promo: 'bg-secondary-container',
};

const FOREGROUND: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'text-on-surface-variant',
  primary: 'text-primary',
  promo: 'text-on-secondary-container',
};

/** Small category or status label. See DESIGN.md, "Chips". */
export function Chip({ label, tone = 'neutral', icon }: Props) {
  const foreground = FOREGROUND[tone];

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${SURFACE[tone]}`}
    >
      {icon ? <MaterialIcons name={icon} size={12} className={foreground} /> : null}
      <Text className={`font-medium text-label-sm ${foreground}`}>{label}</Text>
    </View>
  );
}
