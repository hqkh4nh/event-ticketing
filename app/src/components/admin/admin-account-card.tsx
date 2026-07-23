import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { AdminStatusBadge } from '@/components/admin/admin-ui';
import type { AdminAccount } from '@/lib/mock/admin';

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AdminAccountCard({
  account,
  detail,
  roleLabel,
  statusLabel,
  approveLabel,
  blockLabel,
  restoreLabel,
  onApprove,
  onToggleBlock,
}: {
  account: AdminAccount;
  detail: string;
  roleLabel: string;
  statusLabel: string;
  approveLabel: string;
  blockLabel: string;
  restoreLabel: string;
  onApprove: () => void;
  onToggleBlock: () => void;
}) {
  const isPending = account.status === 'PENDING';
  const isBlocked = account.status === 'BLOCKED';

  return (
    <View className="gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-container">
          <Text className="font-semibold text-label-md text-on-primary-container">
            {initialsOf(account.fullName)}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text numberOfLines={1} className="font-semibold text-body-md text-on-surface">
            {account.fullName}
          </Text>
          <Text numberOfLines={1} className="font-sans text-label-sm text-on-surface-variant">
            {account.email}
          </Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-surface-container px-2.5 py-1">
              <Text className="font-medium text-label-sm text-on-surface-variant">
                {roleLabel}
              </Text>
            </View>
            <AdminStatusBadge status={account.status} label={statusLabel} />
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={22} className="text-outline" />
      </View>

      <View className="flex-row items-center gap-2 border-t border-outline-variant pt-3">
        <MaterialIcons name="info-outline" size={18} className="text-on-surface-variant" />
        <Text className="min-w-0 flex-1 font-sans text-label-sm text-on-surface-variant">
          {detail}
        </Text>
      </View>

      <View className="flex-row gap-2">
        {isPending ? (
          <Pressable
            accessibilityRole="button"
            onPress={onApprove}
            className="h-touch-target-min flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-80"
          >
            <MaterialIcons name="check" size={18} className="text-on-primary" />
            <Text className="font-semibold text-label-md text-on-primary">{approveLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onToggleBlock}
          className={[
            'h-touch-target-min flex-row items-center justify-center gap-2 rounded-full border px-4 active:opacity-80',
            isPending ? '' : 'flex-1',
            isBlocked ? 'border-success' : 'border-outline',
          ].join(' ')}
        >
          <MaterialIcons
            name={isBlocked ? 'lock-open' : 'block'}
            size={18}
            className={isBlocked ? 'text-success' : 'text-on-surface'}
          />
          <Text
            className={`font-semibold text-label-md ${
              isBlocked ? 'text-success' : 'text-on-surface'
            }`}
          >
            {isBlocked ? restoreLabel : blockLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
