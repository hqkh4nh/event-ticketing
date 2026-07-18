import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventForm } from '@/components/organizer/event-form';
import { createEvent, type CreateEventBody } from '@/lib/api/events-organizer';
import { toUserMessage } from '@/lib/api/error-message';

export default function NewEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: CreateEventBody) => createEvent(body),
    onSuccess: (event) => {
      void queryClient.invalidateQueries({ queryKey: ['organizer', 'events'] });
      router.replace({
        pathname: '/organizer/events/[id]',
        params: { id: event.id },
      });
    },
    onError: (err) => setServerError(toUserMessage(err, t)),
  });

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-container-padding py-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-content self-center gap-6">
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                className="active:opacity-60"
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  className="text-on-surface"
                />
              </Pressable>
              <Text className="font-bold text-headline-md text-on-surface">
                {t('organizer.form.createTitle')}
              </Text>
            </View>

            <EventForm
              submitLabel={t('organizer.form.createAction')}
              submitting={mutation.isPending}
              serverError={serverError}
              onSubmit={(body) => {
                setServerError(null);
                mutation.mutate(body);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
