import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminMetricCard,
  AdminScreenHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '@/components/admin/admin-ui';
import { ADMIN_ACCOUNTS, ADMIN_EVENTS } from '@/lib/mock/admin';
import { useAuthStore } from '@/stores/auth-store';

const pendingAccounts = ADMIN_ACCOUNTS.filter((account) => account.status === 'PENDING');

export default function AdminOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const metricWidth = width >= 1160 ? '23.5%' : width >= 620 ? '48.5%' : '47.5%';
  const publishedEvents = ADMIN_EVENTS.filter((event) => event.status === 'PUBLISHED').length;
  const activeScanners = ADMIN_ACCOUNTS.filter(
    (account) => account.role === 'SCANNER' && account.status === 'ACTIVE',
  ).length;

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
              <MaterialIcons name="verified-user" size={22} className="text-on-success" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="font-semibold text-body-md text-on-success-container">
                {t('admin.overview.systemHealthy')}
              </Text>
              <Text className="font-sans text-label-sm text-on-success-container">
                {t('admin.overview.systemHealthyDescription')}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <AdminMetricCard
              icon="pending-actions"
              label={t('admin.metrics.pendingOrganizers')}
              value={String(pendingAccounts.length)}
              helper={t('admin.metrics.pendingOrganizersHelper')}
              tone="warning"
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="event-available"
              label={t('admin.metrics.publishedEvents')}
              value={String(publishedEvents)}
              helper={t('admin.metrics.publishedEventsHelper')}
              tone="success"
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="qr-code-scanner"
              label={t('admin.metrics.activeScanners')}
              value={String(activeScanners)}
              helper={t('admin.metrics.activeScannersHelper')}
              style={{ width: metricWidth }}
            />
            <AdminMetricCard
              icon="receipt-long"
              label={t('admin.metrics.paymentReviews')}
              value="2"
              helper={t('admin.metrics.paymentReviewsHelper')}
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
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              {pendingAccounts.slice(0, 3).map((account, index) => (
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
                      {t(`admin.accountDetails.${account.detailKey}`)}
                    </Text>
                  </View>
                  <AdminStatusBadge
                    status="PENDING"
                    label={t('admin.status.PENDING')}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <AdminSectionHeader
              title={t('admin.overview.attentionTitle')}
              description={t('admin.overview.attentionDescription')}
            />
            <View className="gap-3">
              <View className="flex-row items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <View className="h-11 w-11 items-center justify-center rounded-lg bg-error-container">
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={22}
                    className="text-on-error-container"
                  />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="font-medium text-body-md text-on-surface">
                    {t('admin.overview.paymentReviewTitle')}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('admin.overview.paymentReviewDescription')}
                  </Text>
                </View>
                <View className="rounded-full bg-error-container px-2.5 py-1">
                  <Text className="font-semibold text-label-sm text-on-error-container">2</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <View className="h-11 w-11 items-center justify-center rounded-lg bg-warning-container">
                  <MaterialIcons
                    name="visibility-off"
                    size={22}
                    className="text-on-warning-container"
                  />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="font-medium text-body-md text-on-surface">
                    {t('admin.overview.hiddenEventTitle')}
                  </Text>
                  <Text className="font-sans text-label-sm text-on-surface-variant">
                    {t('admin.overview.hiddenEventDescription')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} className="text-outline" />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
