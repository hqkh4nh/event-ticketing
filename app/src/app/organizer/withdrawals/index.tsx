import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { WithdrawalStatusBadge } from '@/components/withdrawals/withdrawal-status-badge';
import { toUserMessage } from '@/lib/api/error-message';
import {
  cancelWithdrawal,
  getWithdrawalBalance,
  listWithdrawals,
  type Withdrawal,
  withdrawalKeys,
} from '@/lib/api/withdrawals';
import { formatDateTime, formatVndAmount } from '@/lib/format';

const LIST_QUERY = { page: 1, limit: 100 } as const;

function BalanceRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-sans text-label-md text-on-surface-variant">
        {label}
      </Text>
      <Text
        className={
          emphasis
            ? 'font-bold text-numeric-lg text-primary'
            : 'font-medium text-body-md text-on-surface'
        }
      >
        {value}
      </Text>
    </View>
  );
}

export default function OrganizerWithdrawalsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingCancel, setPendingCancel] = useState<Withdrawal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balanceQuery = useQuery({
    queryKey: withdrawalKeys.balance(),
    queryFn: getWithdrawalBalance,
  });
  const listQuery = useQuery({
    queryKey: withdrawalKeys.organizerList(LIST_QUERY),
    queryFn: () => listWithdrawals(LIST_QUERY),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelWithdrawal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
      setPendingCancel(null);
    },
    onError: (mutationError) => {
      setPendingCancel(null);
      setError(toUserMessage(mutationError, t));
    },
  });

  const balance = balanceQuery.data;
  const withdrawals = listQuery.data?.items ?? [];
  const currency = (amount: number) =>
    t('event.price', { price: formatVndAmount(amount, i18n.language) });
  const canRequest =
    balance !== undefined && balance.availableVnd >= balance.minAmountVnd;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-content flex-1 self-center">
        <View className="min-h-16 flex-row items-center gap-3 border-b border-outline-variant px-container-padding py-2">
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-container"
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              className="text-on-surface"
            />
          </Pressable>
          <Text
            numberOfLines={2}
            className="min-w-0 flex-1 text-center font-semibold text-headline-md text-on-surface"
          >
            {t('organizer.withdrawals.title')}
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-container-padding py-6 pb-10"
        >
          {error ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center gap-2 rounded-lg bg-error-container px-4 py-3"
            >
              <MaterialIcons
                name="error"
                size={19}
                className="text-on-error-container"
              />
              <Text className="min-w-0 flex-1 font-medium text-label-md text-on-error-container">
                {error}
              </Text>
              <Pressable
                accessibilityLabel={t('common.done')}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setError(null)}
              >
                <MaterialIcons
                  name="close"
                  size={19}
                  className="text-on-error-container"
                />
              </Pressable>
            </View>
          ) : null}

          {balanceQuery.isPending ? (
            <View className="items-center py-10">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : balanceQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('organizer.withdrawals.loadErrorTitle')}
              description={toUserMessage(balanceQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void balanceQuery.refetch()}
                />
              }
            />
          ) : balance ? (
            <View className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <BalanceRow
                label={t('organizer.withdrawals.available')}
                value={currency(balance.availableVnd)}
                emphasis
              />
              <View className="gap-2 border-t border-outline-variant pt-4">
                <BalanceRow
                  label={t('organizer.withdrawals.settledRevenue')}
                  value={currency(balance.settledRevenueVnd)}
                />
                <BalanceRow
                  label={t('organizer.withdrawals.held')}
                  value={currency(balance.pendingVnd)}
                />
                <BalanceRow
                  label={t('organizer.withdrawals.withdrawn')}
                  value={currency(balance.withdrawnVnd)}
                />
              </View>
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {t('organizer.withdrawals.settlementNote')}
              </Text>
              <Button
                icon="account-balance-wallet"
                label={t('organizer.withdrawals.newRequest')}
                disabled={!canRequest}
                onPress={() => router.push('/organizer/withdrawals/new')}
              />
              {canRequest ? null : (
                <Text className="font-sans text-label-sm text-on-surface-variant">
                  {t('organizer.withdrawals.minimumNote', {
                    amount: currency(balance.minAmountVnd),
                  })}
                </Text>
              )}
            </View>
          ) : null}

          <Text className="font-semibold text-headline-md text-on-surface">
            {t('organizer.withdrawals.historyTitle')}
          </Text>

          {listQuery.isPending ? (
            <View className="items-center py-10">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : listQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('organizer.withdrawals.loadErrorTitle')}
              description={toUserMessage(listQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void listQuery.refetch()}
                />
              }
            />
          ) : withdrawals.length ? (
            <View className="gap-3">
              {withdrawals.map((withdrawal) => (
                <View
                  key={withdrawal.id}
                  className="gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <WithdrawalStatusBadge
                      status={withdrawal.status}
                      label={t(
                        `organizer.withdrawals.status.${withdrawal.status}`,
                      )}
                    />
                    <Text className="font-bold text-numeric-lg text-on-surface">
                      {currency(withdrawal.amountVnd)}
                    </Text>
                  </View>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('organizer.withdrawals.bankSummary', {
                      bank: withdrawal.bankName,
                      account: withdrawal.bankAccountNumber,
                    })}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {formatDateTime(withdrawal.createdAt, i18n.language)}
                  </Text>
                  {withdrawal.rejectionReason ? (
                    <Text className="font-sans text-label-sm text-error">
                      {t('organizer.withdrawals.rejectionSummary', {
                        reason: withdrawal.rejectionReason,
                      })}
                    </Text>
                  ) : null}
                  {withdrawal.transferReference ? (
                    <Text className="font-sans text-label-sm text-on-surface-variant">
                      {t('organizer.withdrawals.referenceSummary', {
                        reference: withdrawal.transferReference,
                      })}
                    </Text>
                  ) : null}
                  {withdrawal.status === 'PENDING' ? (
                    <Button
                      variant="outline"
                      label={t('organizer.actions.cancelWithdrawal')}
                      loading={
                        cancelMutation.isPending &&
                        cancelMutation.variables === withdrawal.id
                      }
                      onPress={() => {
                        setError(null);
                        setPendingCancel(withdrawal);
                      }}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="account-balance-wallet"
              title={t('organizer.withdrawals.emptyTitle')}
              description={t('organizer.withdrawals.emptyDescription')}
            />
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={pendingCancel !== null}
        title={t('organizer.withdrawals.confirmCancelTitle')}
        description={t('organizer.withdrawals.confirmCancelDescription', {
          amount: currency(pendingCancel?.amountVnd ?? 0),
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('organizer.actions.cancelWithdrawal')}
        icon="close"
        loading={cancelMutation.isPending}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          if (!pendingCancel) return;
          cancelMutation.mutate(pendingCancel.id);
        }}
      />
    </SafeAreaView>
  );
}
