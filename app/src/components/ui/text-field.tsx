import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
    label: string;
    error?: string;
    helper?: string;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
    { label, error, helper, ...props },
    ref
) {
    const hasError = Boolean(error);

    return (
        <View className='gap-2'>
            <Text className='font-medium text-[14px] leading-5 text-on-surface-variant dark:text-d-on-surface-variant'>
                {label}
            </Text>

            <TextInput
                ref={ref}
                className={[
                'h-touch-target-min rounded-md border px-4',
                'font-sans text-[16px] leading-6',
                'bg-surface-container-lowest dark:bg-d-surface-container',
                'text-on-surface dark:text-d-on-surface',
                hasError
                    ? 'border-error dark:border-d-error'
                    : 'border-outline dark:border-d-outline',
                ].join(' ')}
                placeholderTextColor="#6c7a77"
                accessibilityLabel={label}
                {...props}
            />

            {hasError ? (
                <Text className="font-sans text-[12px] leading-4 text-error dark:text-d-error">
                {error}
                </Text>
            ) : helper ? (
                <Text className="font-sans text-[12px] leading-4 text-on-surface-variant dark:text-d-on-surface-variant">
                {helper}
                </Text>
            ) : null}
        </View>
    )

})