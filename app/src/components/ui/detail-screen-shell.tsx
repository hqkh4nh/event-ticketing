import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailScreenShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DetailScreenShell({
  title,
  description,
  children,
}: DetailScreenShellProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="min-h-16 flex-row items-center gap-3 border-b border-outline-variant px-container-padding py-2">
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-container"
          >
            <MaterialIcons name="arrow-back" size={23} className="text-on-surface" />
          </Pressable>
          <Text
            numberOfLines={2}
            className="min-w-0 flex-1 text-center font-semibold text-headline-md text-on-surface"
          >
            {title}
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-container-padding py-6 pb-10"
        >
          {description ? (
            <Text className="font-sans text-body-md leading-6 text-on-surface-variant">
              {description}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
