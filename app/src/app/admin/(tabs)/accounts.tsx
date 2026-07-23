import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminAccountCard } from '@/components/admin/admin-account-card';
import { AdminIconButton, AdminScreenHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { themes } from '@/design/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ADMIN_ACCOUNTS,
  type AdminAccount,
  type AdminAccountRole,
} from '@/lib/mock/admin';

type AccountFilter = 'PENDING' | AdminAccountRole;

const FILTERS: AccountFilter[] = ['PENDING', 'ORGANIZER', 'SCANNER', 'ATTENDEE'];

export default function AdminAccountsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const [accounts, setAccounts] = useState(ADMIN_ACCOUNTS);
  const [filter, setFilter] = useState<AccountFilter>('PENDING');
  const [query, setQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [scannerName, setScannerName] = useState('');
  const [scannerEmail, setScannerEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesFilter =
        filter === 'PENDING' ? account.status === 'PENDING' : account.role === filter;
      const matchesQuery =
        !normalizedQuery ||
        account.fullName.toLowerCase().includes(normalizedQuery) ||
        account.email.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [accounts, filter, query]);

  function updateStatus(id: string, status: AdminAccount['status']) {
    setAccounts((current) =>
      current.map((account) => (account.id === id ? { ...account, status } : account)),
    );
  }

  function addScanner() {
    const fullName = scannerName.trim();
    const email = scannerEmail.trim().toLowerCase();
    if (!fullName || !email) return;

    setAccounts((current) => [
      {
        id: `scanner-${Date.now()}`,
        fullName,
        email,
        role: 'SCANNER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        detailKey: 'noAssignment',
      },
      ...current,
    ]);
    setFilter('SCANNER');
    setScannerName('');
    setScannerEmail('');
    setDialogVisible(false);
    setFeedback(t('admin.accounts.scannerCreated'));
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-5xl flex-1 self-center">
        <AdminScreenHeader
          eyebrow={t('admin.brand')}
          title={t('admin.accounts.title')}
          description={t('admin.accounts.description')}
          action={
            <AdminIconButton
              icon="person-add"
              label={t('admin.accounts.createScanner')}
              onPress={() => setDialogVisible(true)}
            />
          }
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-5 px-container-padding py-6"
        >
          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center gap-2 rounded-lg bg-success-container px-4 py-3"
            >
              <MaterialIcons
                name="check-circle"
                size={19}
                className="text-on-success-container"
              />
              <Text className="min-w-0 flex-1 font-medium text-label-md text-on-success-container">
                {feedback}
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
                  className="text-on-success-container"
                />
              </Pressable>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.accounts.searchLabel')}
            </Text>
            <View className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-4">
              <MaterialIcons name="search" size={21} className="text-on-surface-variant" />
              <TextInput
                accessibilityLabel={t('admin.accounts.searchLabel')}
                className="min-w-0 flex-1 font-sans text-body-md text-on-surface"
                placeholder={t('admin.accounts.searchPlaceholder')}
                placeholderClassName="text-on-surface-variant"
                value={query}
                onChangeText={setQuery}
              />
              {query ? (
                <Pressable
                  accessibilityLabel={t('admin.accounts.clearSearch')}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setQuery('')}
                >
                  <MaterialIcons name="cancel" size={19} className="text-outline" />
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
              const count = accounts.filter((account) =>
                value === 'PENDING' ? account.status === 'PENDING' : account.role === value,
              ).length;

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(value)}
                  className={[
                    'h-touch-target-min flex-row items-center justify-center gap-2 rounded-full border px-4',
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
                    {t(`admin.accountFilters.${value}`)}
                  </Text>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      selected ? 'bg-on-primary/15' : 'bg-surface-container'
                    }`}
                  >
                    <Text
                      className={`font-semibold text-label-sm ${
                        selected ? 'text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-headline-md text-on-surface">
              {t('admin.accounts.resultTitle')}
            </Text>
            <Text className="font-medium text-label-md text-on-surface-variant">
              {t('admin.accounts.resultCount', { count: filteredAccounts.length })}
            </Text>
          </View>

          {filteredAccounts.length ? (
            <View className="gap-3">
              {filteredAccounts.map((account) => (
                <AdminAccountCard
                  key={account.id}
                  account={account}
                  detail={t(`admin.accountDetails.${account.detailKey}`)}
                  roleLabel={t(`admin.roles.${account.role}`)}
                  statusLabel={t(`admin.status.${account.status}`)}
                  approveLabel={t('admin.actions.approve')}
                  blockLabel={t('admin.actions.block')}
                  restoreLabel={t('admin.actions.restore')}
                  onApprove={() => {
                    updateStatus(account.id, 'ACTIVE');
                    setFeedback(t('admin.accounts.organizerApproved'));
                  }}
                  onToggleBlock={() => {
                    updateStatus(account.id, account.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED');
                    setFeedback(
                      account.status === 'BLOCKED'
                        ? t('admin.accounts.accountRestored')
                        : t('admin.accounts.accountBlocked'),
                    );
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-12">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container">
                <MaterialIcons name="person-search" size={28} className="text-on-surface-variant" />
              </View>
              <Text className="text-center font-semibold text-body-lg text-on-surface">
                {t('admin.accounts.emptyTitle')}
              </Text>
              <Text className="text-center font-sans text-label-md text-on-surface-variant">
                {t('admin.accounts.emptyDescription')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setDialogVisible(false)}
        statusBarTranslucent
        transparent
        visible={dialogVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable
            accessibilityLabel={t('common.cancel')}
            accessibilityRole="button"
            className="absolute inset-0 bg-black/60"
            onPress={() => setDialogVisible(false)}
          />
          <View
            accessibilityViewIsModal
            className="w-full self-center rounded-t-xl border border-outline-variant bg-surface p-5"
            style={[themes[colorScheme], { maxWidth: 560 }]}
          >
            <View className="mb-5 flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-semibold text-headline-md text-on-surface">
                  {t('admin.accounts.createScanner')}
                </Text>
                <Text className="font-sans text-label-sm text-on-surface-variant">
                  {t('admin.accounts.createScannerDescription')}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
                onPress={() => setDialogVisible(false)}
                className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full active:bg-surface-container"
              >
                <MaterialIcons name="close" size={23} className="text-on-surface" />
              </Pressable>
            </View>
            <View className="gap-4">
              <TextField
                label={t('auth.field.fullName')}
                placeholder={t('auth.field.fullNamePlaceholder')}
                value={scannerName}
                onChangeText={setScannerName}
              />
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label={t('auth.field.email')}
                placeholder={t('auth.field.emailPlaceholder')}
                value={scannerEmail}
                onChangeText={setScannerEmail}
              />
              <Button
                icon="person-add"
                label={t('admin.accounts.createAction')}
                disabled={!scannerName.trim() || !scannerEmail.trim()}
                onPress={addScanner}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
