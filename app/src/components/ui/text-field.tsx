import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
};

/** Label above, error below. See DESIGN.md, "Input Fields". */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, helper, ...props },
  ref,
) {
  const hasError = Boolean(error);
  const tokens = useTokens();

  return (
    <View className="gap-2">
      <Text className="font-medium text-label-md text-on-surface-variant">{label}</Text>

      <TextInput
        ref={ref}
        className={[
          'h-touch-target-min rounded-ctl border px-4',
          'font-sans text-body-md',
          'bg-surface-container-lowest text-on-surface',
          // Coral focus ring; error border wins when present.
          hasError ? 'border-error' : 'border-outline focus:border-primary',
        ].join(' ')}
        placeholderTextColor={tokens['on-surface-variant']}
        accessibilityLabel={label}
        {...props}
      />

      {hasError ? (
        <Text className="font-sans text-label-sm text-error">{error}</Text>
      ) : helper ? (
        <Text className="font-sans text-label-sm text-on-surface-variant">{helper}</Text>
      ) : null}
    </View>
  );
});
