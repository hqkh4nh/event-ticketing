import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminScreenHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '@/components/admin/admin-ui';
import {
  AdminActionQueues,
  AdminPlatformOverview,
} from '@/components/admin/admin-operations-dashboard';
import { RevenueReportDialog } from '@/components/statistics/revenue-report-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminKeys,
  listAdminEvents,
  listAdminOrganizers,
} from '@/lib/api/admin';
import { toUserMessage } from '@/lib/api/error-message';
import {
  listPaymentReviews,
  paymentReviewKeys,
} from '@/lib/api/payment-reviews';
import { getAdminStatistics, statisticsKeys } from '@/lib/api/statistics';
import { useAuthStore } from '@/stores/auth-store';

const PENDING_ORGANIZERS_QUERY = {
  status: 'PENDING',
  page: 1,
  limit: 3,
} as const;
const PENDING_EVENTS_QUERY = {
  status: 'PENDING_REVIEW',
  page: 1,
  limit: 1,
} as const;
const OPEN_PAYMENT_REVIEWS_QUERY = {
  resolved: false,
  page: 1,
  limit: 1,
} as const;

export default function AdminOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [reportOpen, setReportOpen] = useState(false);

  const pendingQuery = useQuery({
    queryKey: adminKeys.organizerList(PENDING_ORGANIZERS_QUERY),
    queryFn: () => listAdminOrganizers(PENDING_ORGANIZERS_QUERY),
  });
  const pendingEventsQuery = useQuery({
    queryKey: adminKeys.eventList(PENDING_EVENTS_QUERY),
    queryFn: () => listAdminEvents(PENDING_EVENTS_QUERY),
  });
  const paymentReviewQuery = useQuery({
    queryKey: paymentReviewKeys.list(OPEN_PAYMENT_REVIEWS_QUERY),
    queryFn: () => listPaymentReviews(OPEN_PAYMENT_REVIEWS_QUERY),
  });
  const statisticsQuery = useQuery({
    queryKey: statisticsKeys.admin(),
    queryFn: getAdminStatistics,
  });

  const pendingAccounts = pendingQuery.data?.items ?? [];

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
          <AdminActionQueues
            organizerQueue={
              pendingQuery.isPending
                ? { status: 'pending' }
                : pendingQuery.isError
                  ? {
                      status: 'error',
                      onRetry: () => void pendingQuery.refetch(),
                    }
                  : { status: 'success', count: pendingQuery.data.total }
            }
            eventQueue={
              pendingEventsQuery.isPending
                ? { status: 'pending' }
                : pendingEventsQuery.isError
                  ? {
                      status: 'error',
                      onRetry: () => void pendingEventsQuery.refetch(),
                    }
                  : {
                      status: 'success',
                      count: pendingEventsQuery.data.total,
                    }
            }
            paymentQueue={
              paymentReviewQuery.isPending
                ? { status: 'pending' }
                : paymentReviewQuery.isError
                  ? {
                      status: 'error',
                      onRetry: () => void paymentReviewQuery.refetch(),
                    }
                  : {
                      status: 'success',
                      count: paymentReviewQuery.data.openCount,
                    }
            }
            onOpenOrganizers={() => router.push('/admin/accounts')}
            onOpenEvents={() => router.push('/admin/events')}
            onOpenPayments={() => router.push('/admin/payments/review')}
          />

          <AdminPlatformOverview
            statistics={statisticsQuery.data}
            isPending={statisticsQuery.isPending}
            errorMessage={
              statisticsQuery.isError
                ? toUserMessage(statisticsQuery.error, t)
                : undefined
            }
            onRetry={() => void statisticsQuery.refetch()}
            onExportReport={() => setReportOpen(true)}
          />

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
        </ScrollView>
      </View>
      <RevenueReportDialog
        scope="admin"
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </SafeAreaView>
  );
}
