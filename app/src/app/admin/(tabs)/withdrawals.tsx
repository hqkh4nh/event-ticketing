import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminScreenHeader } from '@/components/admin/admin-ui';
import { AdminWithdrawalCard } from '@/components/admin/admin-withdrawal-card';
import { WithdrawalPromptDialog } from '@/components/admin/withdrawal-prompt-dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TextField } from '@/components/ui/text-field';
import { toUserMessage } from '@/lib/api/error-message';
import {
  approveAdminWithdrawal,
  listAdminWithdrawals,
  markAdminWithdrawalPaid,
  rejectAdminWithdrawal,
  type Withdrawal,
  type WithdrawalStatus,
  withdrawalKeys,
} from '@/lib/api/withdrawals';
import { formatDateTime, formatVndAmount } from '@/lib/format';

type WithdrawalFilter = 'ALL' | WithdrawalStatus;

const FILTERS: WithdrawalFilter[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED',
];
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_LIMIT = 100;

type Feedback = {
  message: string;
  tone: 'success' | 'error';
};

export default function AdminWithdrawalsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<WithdrawalFilter>('PENDING');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingApproval, setPendingApproval] = useState<Withdrawal | null>(
    null,
  );
  const [pendingRejection, setPendingRejection] = useState<Withdrawal | null>(
    null,
  );
  const [pendingPayment, setPendingPayment] = useState<Withdrawal | null>(null);
  const [reason, setReason] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const queryParams = useMemo(
    () => ({
      status: filter === 'ALL' ? undefined : filter,
      search: debouncedQuery || undefined,
      page: 1,
      limit: PAGE_LIMIT,
    }),
    [debouncedQuery, filter],
  );

  const withdrawalsQuery = useQuery({
    queryKey: withdrawalKeys.adminList(queryParams),
    queryFn: () => listAdminWithdrawals(queryParams),
  });

  function onSettled(message: string) {
    void queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
    setFeedback({ tone: 'success', message });
  }

  function onFailed(error: unknown) {
    setFeedback({ tone: 'error', message: toUserMessage(error, t) });
  }

  const approvalMutation = useMutation({
    mutationFn: (id: string) => approveAdminWithdrawal(id),
    onSuccess: () => {
      setPendingApproval(null);
      onSettled(t('admin.withdrawals.approvedSuccess'));
    },
    onError: (error) => {
      setPendingApproval(null);
      onFailed(error);
    },
  });

  const rejectionMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      rejectAdminWithdrawal(id, value),
    onSuccess: () => {
      setPendingRejection(null);
      setReason('');
      onSettled(t('admin.withdrawals.rejectedSuccess'));
    },
    onError: (error) => {
      setPendingRejection(null);
      setReason('');
      onFailed(error);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      transferReference?: string;
      adminNote?: string;
    }) => markAdminWithdrawalPaid(id, body),
    onSuccess: () => {
      setPendingPayment(null);
      setTransferReference('');
      setAdminNote('');
      onSettled(t('admin.withdrawals.paidSuccess'));
    },
    onError: (error) => {
      setPendingPayment(null);
      setTransferReference('');
      setAdminNote('');
      onFailed(error);
    },
  });

  const withdrawals = withdrawalsQuery.data?.items ?? [];
  const total = withdrawalsQuery.data?.total ?? 0;
  const currency = (amount: number) =>
    t('event.price', { price: formatVndAmount(amount, i18n.language) });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-wide flex-1 self-center">
        <AdminScreenHeader
          eyebrow={t('admin.brand')}
          title={t('admin.withdrawals.title')}
          description={t('admin.withdrawals.description')}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-container-padding py-6"
        >
          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              className={[
                'flex-row items-center gap-2 rounded-lg px-4 py-3',
                feedback.tone === 'success'
                  ? 'bg-success-container'
                  : 'bg-error-container',
              ].join(' ')}
            >
              <MaterialIcons
                name={feedback.tone === 'success' ? 'check-circle' : 'error'}
                size={19}
                className={
                  feedback.tone === 'success'
                    ? 'text-on-success-container'
                    : 'text-on-error-container'
                }
              />
              <Text
                className={[
                  'min-w-0 flex-1 font-medium text-label-md',
                  feedback.tone === 'success'
                    ? 'text-on-success-container'
                    : 'text-on-error-container',
                ].join(' ')}
              >
                {feedback.message}
              </Text>
              <Pressable
                accessibilityLabel={t('common.done')}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setFeedback(null)}
              >
                <MaterialIcons
                  name="close"
                  size={19}
                  className={
                    feedback.tone === 'success'
                      ? 'text-on-success-container'
                      : 'text-on-error-container'
                  }
                />
              </Pressable>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.withdrawals.searchLabel')}
            </Text>
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-4">
              <MaterialIcons
                name="search"
                size={21}
                className="text-on-surface-variant"
              />
              <TextInput
                accessibilityLabel={t('admin.withdrawals.searchLabel')}
                className="min-w-0 flex-1 font-sans text-body-md text-on-surface"
                placeholder={t('admin.withdrawals.searchPlaceholder')}
                placeholderClassName="text-on-surface-variant"
                value={query}
                onChangeText={setQuery}
              />
              {query ? (
                <Pressable
                  accessibilityLabel={t('admin.withdrawals.clearSearch')}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setQuery('')}
                >
                  <MaterialIcons
                    name="cancel"
                    size={19}
                    className="text-outline"
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {FILTERS.map((value) => {
              const selected = value === filter;

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(value)}
                  className={[
                    'h-touch-target-min items-center justify-center rounded-full border px-4',
                    selected
                      ? 'border-primary bg-primary'
                      : 'border-outline-variant bg-surface-container-lowest',
                  ].join(' ')}
                >
                  <Text
                    className={`font-semibold text-label-md ${
                      selected ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    {t(`admin.withdrawalFilters.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('admin.withdrawals.resultTitle')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.withdrawals.resultCount', { count: total })}
            </Text>
          </View>

          {withdrawalsQuery.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator className="text-primary" />
            </View>
          ) : withdrawalsQuery.isError ? (
            <EmptyState
              icon="cloud-off"
              title={t('admin.withdrawals.loadErrorTitle')}
              description={toUserMessage(withdrawalsQuery.error, t)}
              action={
                <Button
                  label={t('common.retry')}
                  onPress={() => void withdrawalsQuery.refetch()}
                />
              }
            />
          ) : withdrawals.length ? (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {withdrawals.map((withdrawal) => {
                const busy =
                  (approvalMutation.isPending &&
                    approvalMutation.variables === withdrawal.id) ||
                  (rejectionMutation.isPending &&
                    rejectionMutation.variables?.id === withdrawal.id) ||
                  (paymentMutation.isPending &&
                    paymentMutation.variables?.id === withdrawal.id);

                return (
                  <View key={withdrawal.id} className="w-full md:w-[48%]">
                    <AdminWithdrawalCard
                      withdrawal={withdrawal}
                      busy={busy}
                      statusLabel={t(
                        `admin.withdrawalStatus.${withdrawal.status}`,
                      )}
                      amountLabel={currency(withdrawal.amountVnd)}
                      bankLabel={t('admin.withdrawals.bankSummary', {
                        bank: withdrawal.bankName,
                        account: withdrawal.bankAccountNumber,
                        holder: withdrawal.bankAccountHolder,
                      })}
                      submittedLabel={t('admin.withdrawals.submittedAt', {
                        date: formatDateTime(
                          withdrawal.createdAt,
                          i18n.language,
                        ),
                      })}
                      noteLabel={
                        withdrawal.organizerNote
                          ? t('admin.withdrawals.noteSummary', {
                              note: withdrawal.organizerNote,
                            })
                          : undefined
                      }
                      rejectionLabel={
                        withdrawal.rejectionReason
                          ? t('admin.withdrawals.rejectionSummary', {
                              reason: withdrawal.rejectionReason,
                            })
                          : undefined
                      }
                      referenceLabel={
                        withdrawal.transferReference
                          ? t('admin.withdrawals.referenceSummary', {
                              reference: withdrawal.transferReference,
                            })
                          : undefined
                      }
                      approveLabel={t('admin.actions.approveWithdrawal')}
                      rejectLabel={t('admin.actions.rejectWithdrawal')}
                      markPaidLabel={t('admin.actions.markWithdrawalPaid')}
                      onApprove={() => {
                        setFeedback(null);
                        setPendingApproval(withdrawal);
                      }}
                      onReject={() => {
                        setFeedback(null);
                        setReason('');
                        setPendingRejection(withdrawal);
                      }}
                      onMarkPaid={() => {
                        setFeedback(null);
                        setTransferReference('');
                        setAdminNote('');
                        setPendingPayment(withdrawal);
                      }}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="account-balance-wallet"
              title={t('admin.withdrawals.emptyTitle')}
              description={t('admin.withdrawals.emptyDescription')}
            />
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={pendingApproval !== null}
        title={t('admin.withdrawals.confirmApproveTitle')}
        description={t('admin.withdrawals.confirmApproveDescription', {
          organizer: pendingApproval?.organizerName ?? '',
          amount: currency(pendingApproval?.amountVnd ?? 0),
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.approveWithdrawal')}
        icon="verified"
        tone="primary"
        loading={approvalMutation.isPending}
        onCancel={() => setPendingApproval(null)}
        onConfirm={() => {
          if (!pendingApproval) return;
          approvalMutation.mutate(pendingApproval.id);
        }}
      />

      <WithdrawalPromptDialog
        visible={pendingRejection !== null}
        title={t('admin.withdrawals.confirmRejectTitle')}
        description={t('admin.withdrawals.confirmRejectDescription', {
          organizer: pendingRejection?.organizerName ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.rejectWithdrawal')}
        icon="block"
        loading={rejectionMutation.isPending}
        confirmDisabled={reason.trim().length === 0}
        onCancel={() => {
          setPendingRejection(null);
          setReason('');
        }}
        onConfirm={() => {
          if (!pendingRejection) return;
          rejectionMutation.mutate({
            id: pendingRejection.id,
            value: reason.trim(),
          });
        }}
      >
        <TextField
          label={t('admin.withdrawals.reasonLabel')}
          placeholder={t('admin.withdrawals.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={500}
        />
      </WithdrawalPromptDialog>

      <WithdrawalPromptDialog
        visible={pendingPayment !== null}
        title={t('admin.withdrawals.confirmPaidTitle')}
        description={t('admin.withdrawals.confirmPaidDescription', {
          organizer: pendingPayment?.organizerName ?? '',
          amount: currency(pendingPayment?.amountVnd ?? 0),
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.actions.markWithdrawalPaid')}
        icon="payments"
        tone="primary"
        loading={paymentMutation.isPending}
        onCancel={() => {
          setPendingPayment(null);
          setTransferReference('');
          setAdminNote('');
        }}
        onConfirm={() => {
          if (!pendingPayment) return;
          paymentMutation.mutate({
            id: pendingPayment.id,
            transferReference: transferReference.trim() || undefined,
            adminNote: adminNote.trim() || undefined,
          });
        }}
      >
        <TextField
          label={t('admin.withdrawals.referenceLabel')}
          placeholder={t('admin.withdrawals.referencePlaceholder')}
          helper={t('admin.withdrawals.referenceHelper')}
          value={transferReference}
          onChangeText={setTransferReference}
          maxLength={100}
        />
        <TextField
          label={t('admin.withdrawals.adminNoteLabel')}
          placeholder={t('admin.withdrawals.adminNotePlaceholder')}
          value={adminNote}
          onChangeText={setAdminNote}
          multiline
          maxLength={500}
        />
      </WithdrawalPromptDialog>
    </SafeAreaView>
  );
}
