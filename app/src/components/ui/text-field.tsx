import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

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

  return (
    <View className="gap-2">
      <Text className="font-medium text-label-md text-on-surface-variant">{label}</Text>

      <TextInput
        ref={ref}
        className={[
          'h-touch-target-min rounded-md border px-4',
          'font-sans text-body-md',
          'bg-surface-container-lowest text-on-surface',
          hasError ? 'border-error' : 'border-outline',
        ].join(' ')}
        // NativeWind maps this back onto `placeholderTextColor`. A literal
        // colour here cannot follow the scheme, and the light outline this
        // used to pass would sit at roughly 2:1 against the dark surface.
        placeholderClassName="text-on-surface-variant"
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
