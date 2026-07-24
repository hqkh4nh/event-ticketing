import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, type PressableProps, Text } from 'react-native';

type Props = Omit<PressableProps, 'children'> & {
  icon?: keyof typeof MaterialIcons.glyphMap;
  label: string;
  loading?: boolean;
  // `outline` is the secondary (thin-bordered) button; `ghost` is text only.
  variant?: 'primary' | 'outline' | 'ghost';
};

const CONTAINER: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-primary',
  outline: 'border border-primary',
  ghost: '',
};

export function Button({
  icon,
  label,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled === true || loading;
  const textTone = variant === 'primary' ? 'text-on-primary' : 'text-primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={[
        'h-cta-height flex-row items-center justify-center gap-2 rounded-ctl px-6 active:scale-[0.98]',
        CONTAINER[variant],
        isDisabled ? 'opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <ActivityIndicator className={textTone} />
      ) : (
        <>
          {icon ? <MaterialIcons name={icon} size={20} className={textTone} /> : null}
          <Text className={`font-semibold text-body-md ${textTone}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
