import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';
import { TextField } from '@/components/ui/text-field';
import { updateMe } from '@/lib/api/auth';
import { toFieldErrors, toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

type FieldErrors = {
  fullName?: string;
  phone?: string;
};

function initialsOf(fullName?: string): string {
  if (!fullName) return 'ET';

  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function AccountProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: updateMe,
  });

  function validate(): boolean {
    const next: FieldErrors = {};
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      next.fullName = t('accountProfile.errors.nameRequired');
    } else if (normalizedName.length < 2) {
      next.fullName = t('accountProfile.errors.nameShort');
    }

    if (
      normalizedPhone &&
      (normalizedPhone.length > 20 ||
        !/^\+?[0-9][0-9 .-]{7,19}$/.test(normalizedPhone))
    ) {
      next.phone = t('accountProfile.errors.phoneInvalid');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    setFeedback(null);
    if (!validate()) return;

    try {
      const updatedUser = await mutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      });
      await updateUser(updatedUser);
      setFullName(updatedUser.fullName);
      setPhone(updatedUser.phone ?? '');
      setErrors({});
      setFeedback({
        tone: 'success',
        message: t('accountProfile.success'),
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        ...toFieldErrors(error, t),
      }));
      setFeedback({
        tone: 'error',
        message: toUserMessage(error, t),
      });
    }
  }

  if (!user) return null;

  return (
    <DetailScreenShell
      title={t('accountProfile.title')}
      description={t('accountProfile.description')}
    >
      <View className="items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-container">
          <Text className="font-bold text-display-sm text-on-primary-container">
            {initialsOf(fullName)}
          </Text>
        </View>
        <Text className="text-center font-medium text-label-md text-on-surface-variant">
          {t('accountProfile.avatarDescription')}
        </Text>
      </View>

      {feedback ? (
        <View
          accessibilityRole="alert"
          className={[
            'flex-row items-start gap-3 rounded-xl border p-4',
            feedback.tone === 'success'
              ? 'border-primary bg-primary-container'
              : 'border-error bg-error-container',
          ].join(' ')}
        >
          <MaterialIcons
            name={feedback.tone === 'success' ? 'check-circle' : 'error-outline'}
            size={21}
            className={
              feedback.tone === 'success' ? 'text-on-primary-container' : 'text-on-error-container'
            }
          />
          <Text
            className={[
              'min-w-0 flex-1 font-sans text-body-md',
              feedback.tone === 'success'
                ? 'text-on-primary-container'
                : 'text-on-error-container',
            ].join(' ')}
          >
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <View className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <TextField
          label={t('accountProfile.fullName')}
          placeholder={t('accountProfile.fullNamePlaceholder')}
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            setErrors((current) => ({ ...current, fullName: undefined }));
            setFeedback(null);
          }}
          error={errors.fullName}
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label={t('accountProfile.email')}
          value={user.email ?? ''}
          helper={t('accountProfile.emailReadOnly')}
          editable={false}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label={t('accountProfile.phone')}
          placeholder={t('accountProfile.phonePlaceholder')}
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setErrors((current) => ({ ...current, phone: undefined }));
            setFeedback(null);
          }}
          error={errors.phone}
          helper={t('accountProfile.phoneOptional')}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </View>

      <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <View className="flex-row items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
          <Text className="font-sans text-body-md text-on-surface-variant">
            {t('accountProfile.role')}
          </Text>
          <Text className="font-medium text-body-md text-on-surface">
            {t(`accountProfile.roles.${user.role}`)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-4 px-4 py-3">
          <Text className="font-sans text-body-md text-on-surface-variant">
            {t('accountProfile.status')}
          </Text>
          <View className="rounded-full bg-primary-container px-3 py-1">
            <Text className="font-medium text-label-sm text-on-primary-container">
              {t(`accountProfile.statuses.${user.status}`)}
            </Text>
          </View>
        </View>
      </View>

      <Button
        icon="save"
        label={t('accountProfile.save')}
        loading={mutation.isPending}
        onPress={() => void handleSave()}
      />
    </DetailScreenShell>
  );
}
