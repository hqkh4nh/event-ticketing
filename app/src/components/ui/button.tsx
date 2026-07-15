import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
} from 'react-native';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export function Button({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled === true || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={[
        'h-cta-height flex-row items-center justify-center rounded-full px-6 active:scale-[0.98]',
        isPrimary
          ? 'bg-primary dark:bg-d-primary'
          : 'border border-primary dark:border-d-primary',
        isDisabled ? 'opacity-40' : '',
      ].filter(Boolean).join(' ')} 
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : '#006b5f'} />
      ) : (
        <Text
          className={[
            'font-semibold text-[16px] leading-6',
            isPrimary
              ? 'text-on-primary dark:text-d-on-primary'
              : 'text-primary dark:text-d-primary',
          ].join(' ')}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}