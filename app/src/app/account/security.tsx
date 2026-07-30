import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';
import { TextField } from '@/components/ui/text-field';
import { changePassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { toFieldErrors, toUserMessage } from '@/lib/api/error-message';

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: changePassword,
  });

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!currentPassword) {
      next.currentPassword = t('accountSecurity.errors.currentRequired');
    }
    if (!newPassword) {
      next.newPassword = t('accountSecurity.errors.newRequired');
    } else if (newPassword.length < 8) {
      next.newPassword = t('accountSecurity.errors.newShort');
    } else if (newPassword === currentPassword) {
      next.newPassword = t('accountSecurity.errors.samePassword');
    }
    if (!confirmPassword) {
      next.confirmPassword = t('accountSecurity.errors.confirmRequired');
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = t('accountSecurity.errors.confirmMismatch');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleChangePassword() {
    setFeedback(null);
    if (!validate()) return;

    try {
      await mutation.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setFeedback({
        tone: 'success',
        message: t('accountSecurity.success'),
      });
    } catch (error) {
      const apiFieldErrors = toFieldErrors(error, t);
      const nextErrors: FieldErrors = { ...apiFieldErrors };

      if (error instanceof ApiError) {
        if (error.code === 'CURRENT_PASSWORD_INCORRECT') {
          nextErrors.currentPassword = t('api.error.CURRENT_PASSWORD_INCORRECT');
        }
        if (error.code === 'PASSWORD_UNCHANGED') {
          nextErrors.newPassword = t('api.error.PASSWORD_UNCHANGED');
        }
      }

      setErrors((current) => ({ ...current, ...nextErrors }));
      setFeedback({
        tone: 'error',
        message: toUserMessage(error, t),
      });
    }
  }

  return (
    <DetailScreenShell
      title={t('accountSecurity.title')}
      description={t('accountSecurity.description')}
    >
      <View className="flex-row items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcons name="verified-user" size={21} className="text-on-primary-container" />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-semibold text-body-md text-on-surface">
            {t('accountSecurity.noticeTitle')}
          </Text>
          <Text className="font-sans text-label-md leading-5 text-on-surface-variant">
            {t('accountSecurity.noticeDescription')}
          </Text>
        </View>
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
          label={t('accountSecurity.currentPassword')}
          placeholder={t('accountSecurity.currentPasswordPlaceholder')}
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            setErrors((current) => ({ ...current, currentPassword: undefined }));
            setFeedback(null);
          }}
          error={errors.currentPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label={t('accountSecurity.newPassword')}
          placeholder={t('accountSecurity.newPasswordPlaceholder')}
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setErrors((current) => ({ ...current, newPassword: undefined }));
            setFeedback(null);
          }}
          error={errors.newPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label={t('accountSecurity.confirmPassword')}
          placeholder={t('accountSecurity.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
            setFeedback(null);
          }}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => void handleChangePassword()}
        />
      </View>

      <Button
        icon="lock-reset"
        label={t('accountSecurity.changePassword')}
        loading={mutation.isPending}
        onPress={() => void handleChangePassword()}
      />
    </DetailScreenShell>
  );
}
