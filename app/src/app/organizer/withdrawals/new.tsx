import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailScreenShell } from '@/components/ui/detail-screen-shell';
import { TextField } from '@/components/ui/text-field';
import { toUserMessage } from '@/lib/api/error-message';
import {
  createWithdrawal,
  getWithdrawalBalance,
  withdrawalKeys,
} from '@/lib/api/withdrawals';
import { formatVndAmount } from '@/lib/format';

type FieldErrors = Partial<
  Record<
    'amountVnd' | 'bankName' | 'bankAccountNumber' | 'bankAccountHolder',
    string
  >
>;

export default function NewWithdrawalScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [organizerNote, setOrganizerNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const balanceQuery = useQuery({
    queryKey: withdrawalKeys.balance(),
    queryFn: getWithdrawalBalance,
  });
  const balance = balanceQuery.data;

  const mutation = useMutation({
    mutationFn: createWithdrawal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
      router.back();
    },
    onError: (error) => setSubmitError(toUserMessage(error, t)),
  });

  const currency = (value: number) =>
    t('event.price', { price: formatVndAmount(value, i18n.language) });

  function submit() {
    const amountVnd = Number(amount.replace(/\D/g, ''));
    const next: FieldErrors = {};

    if (!Number.isInteger(amountVnd) || amountVnd <= 0) {
      next.amountVnd = t('organizer.error.withdrawalAmountInvalid');
    } else if (balance && amountVnd < balance.minAmountVnd) {
      next.amountVnd = t('organizer.error.withdrawalAmountTooSmall', {
        amount: currency(balance.minAmountVnd),
      });
    } else if (balance && amountVnd > balance.availableVnd) {
      next.amountVnd = t('organizer.error.withdrawalAmountTooLarge', {
        amount: currency(balance.availableVnd),
      });
    }
    if (!bankName.trim()) {
      next.bankName = t('organizer.error.bankNameRequired');
    }
    if (!bankAccountNumber.trim()) {
      next.bankAccountNumber = t('organizer.error.bankAccountNumberRequired');
    }
    if (!bankAccountHolder.trim()) {
      next.bankAccountHolder = t('organizer.error.bankAccountHolderRequired');
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitError(null);
    mutation.mutate({
      amountVnd,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountHolder: bankAccountHolder.trim(),
      ...(organizerNote.trim() ? { organizerNote: organizerNote.trim() } : {}),
    });
  }

  return (
    <DetailScreenShell
      title={t('organizer.withdrawals.newTitle')}
      description={t('organizer.withdrawals.newDescription')}
    >
      {balance ? (
        <View className="gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <Text className="font-sans text-label-md text-on-surface-variant">
            {t('organizer.withdrawals.available')}
          </Text>
          <Text className="font-bold text-numeric-lg text-primary">
            {currency(balance.availableVnd)}
          </Text>
          <Text className="font-sans text-label-sm text-on-surface-variant">
            {t('organizer.withdrawals.minimumNote', {
              amount: currency(balance.minAmountVnd),
            })}
          </Text>
        </View>
      ) : null}

      <TextField
        label={t('organizer.withdrawals.amountLabel')}
        placeholder={t('organizer.withdrawals.amountPlaceholder')}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        error={errors.amountVnd}
      />
      <TextField
        label={t('organizer.withdrawals.bankNameLabel')}
        placeholder={t('organizer.withdrawals.bankNamePlaceholder')}
        value={bankName}
        onChangeText={setBankName}
        error={errors.bankName}
        maxLength={100}
      />
      <TextField
        label={t('organizer.withdrawals.bankAccountNumberLabel')}
        placeholder={t('organizer.withdrawals.bankAccountNumberPlaceholder')}
        keyboardType="number-pad"
        value={bankAccountNumber}
        onChangeText={setBankAccountNumber}
        error={errors.bankAccountNumber}
        maxLength={50}
      />
      <TextField
        label={t('organizer.withdrawals.bankAccountHolderLabel')}
        placeholder={t('organizer.withdrawals.bankAccountHolderPlaceholder')}
        helper={t('organizer.withdrawals.bankAccountHolderHelper')}
        autoCapitalize="characters"
        value={bankAccountHolder}
        onChangeText={setBankAccountHolder}
        error={errors.bankAccountHolder}
        maxLength={100}
      />
      <TextField
        label={t('organizer.withdrawals.noteLabel')}
        placeholder={t('organizer.withdrawals.notePlaceholder')}
        value={organizerNote}
        onChangeText={setOrganizerNote}
        multiline
        maxLength={500}
      />

      {submitError ? (
        <Text
          accessibilityLiveRegion="polite"
          className="font-sans text-label-md text-error"
        >
          {submitError}
        </Text>
      ) : null}

      <Button
        label={t('organizer.withdrawals.submit')}
        loading={mutation.isPending}
        onPress={submit}
      />
    </DetailScreenShell>
  );
}
