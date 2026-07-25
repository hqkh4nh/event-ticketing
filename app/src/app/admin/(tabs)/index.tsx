import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminMetricCard,
  AdminScreenHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { adminKeys, listAdminOrganizers } from '@/lib/api/admin';
import { toUserMessage } from '@/lib/api/error-message';
import { useAuthStore } from '@/stores/auth-store';

const PENDING_QUERY = { status: 'PENDING', page: 1, limit: 3 } as const;

export default function AdminOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const metricWidth = width >= 1160 ? '23.5%' : width >= 620 ? '48.5%' : '47.5%';

  const pendingQuery = useQuery({
    queryKey: adminKeys.organizerList(PENDING_QUERY),
    queryFn: () => listAdminOrganizers(PENDING_QUERY),
  });

  const pendingAccounts = pendingQuery.data?.items ?? [];
  const pendingTotal = pendingQuery.data?.total;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <View className="w-full max-w-5xl flex-1 self-center">
        <AdminScreenHeader
          eyebrow={t('admin.brand')}
          title={t('admin.overview.greeting', {
            name: user?.fullName?.split(/\s+/).slice(-1)[0] ?? t('admin.role'),
          })}
          description={new Intl.DateTimeFormat(i18n.language, {
            dateStyle: 'full',
          }).format(new Date())}
          action={
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-container">
              <MaterialIcons
                name="admin-panel-settings"
                size={25}
                className="text-on-primary-container"
              />
            </View>
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-7 px-container-padding py-6"
        >
          <View className="flex-row items-center gap-3 rounded-xl border border-success/40 bg-success-container p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-success">
              <MaterialIcons name="cloud-done" size={22} className="text-on-success" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="font-semibold text-body-md text-on-success-container">
                {t('admin.overview.organizerApiConnected')}
              </Text>
              <Text className="font-sans text-label-sm text-on-success-container">
                {t('admin.overview.organizerApiConnectedDescription')}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <AdminMetricCard
              icon="pending-actions"
              label={t('admin.metrics.pendingOrganizers')}
              value={pendingTotal === undefined ? '—' : String(pendingTotal)}
              helper={t('admin.metrics.pendingOrganizersHelper')}
              tone="warning"
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="event-available"
              label={t('admin.metrics.publishedEvents')}
              value="—"
              helper={t('admin.metrics.notConnected')}
              tone="success"
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="qr-code-scanner"
              label={t('admin.metrics.activeScanners')}
              value="—"
              helper={t('admin.metrics.notConnected')}
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="receipt-long"
              label={t('admin.metrics.paymentReviews')}
              value="—"
              helper={t('admin.metrics.notConnected')}
              tone="error"
              style={{ width: metricWidth }}
            />
          </View>

          <View className="gap-3">
            <AdminSectionHeader
              title={t('admin.overview.pendingTitle')}
              description={t('admin.overview.pendingDescription')}
              actionLabel={t('admin.actions.viewAll')}
              onAction={() => router.push('/admin/accounts')}
            />

            {pendingQuery.isPending ? (
              <View className="items-center py-10">
                <ActivityIndicator className="text-primary" />
              </View>
            ) : pendingQuery.isError ? (
              <EmptyState
                icon="cloud-off"
                title={t('admin.accounts.loadErrorTitle')}
                description={toUserMessage(pendingQuery.error, t)}
                action={
                  <Button
                    label={t('common.retry')}
                    onPress={() => void pendingQuery.refetch()}
                  />
                }
              />
            ) : pendingAccounts.length ? (
              <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                {pendingAccounts.map((account, index) => (
                  <Pressable
                    key={account.id}
                    accessibilityRole="button"
                    onPress={() => router.push('/admin/accounts')}
                    className={[
                      'min-h-touch-target-min flex-row items-center gap-3 p-4 active:bg-surface-container-low',
                      index === 0 ? '' : 'border-t border-outline-variant',
                    ].join(' ')}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-warning-container">
                      <MaterialIcons
                        name="person"
                        size={20}
                        className="text-on-warning-container"
                      />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text
                        numberOfLines={1}
                        className="font-medium text-body-md text-on-surface"
                      >
                        {account.fullName}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="font-sans text-label-sm text-on-surface-variant"
                      >
                        {account.email ?? t('admin.accounts.emailUnavailable')}
                      </Text>
                    </View>
                    <AdminStatusBadge
                      status="PENDING"
                      label={t('admin.status.PENDING')}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="task-alt"
                title={t('admin.overview.noPendingTitle')}
                description={t('admin.overview.noPendingDescription')}
              />
            )}
          </View>

          <View className="gap-3">
            <AdminSectionHeader
              title={t('admin.overview.integrationTitle')}
              description={t('admin.overview.integrationDescription')}
            />
            <View className="flex-row items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container">
                <MaterialIcons
                  name="hub"
                  size={22}
                  className="text-on-primary-container"
                />
              </View>
              <Text className="min-w-0 flex-1 font-sans text-label-md text-on-surface-variant">
                {t('admin.overview.integrationNote')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
