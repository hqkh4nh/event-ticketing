import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View, type ViewProps } from 'react-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

export function AdminScreenHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="gap-3 border-b border-outline-variant px-container-padding py-5">
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          {eyebrow ? (
            <Text className="font-medium text-label-sm uppercase text-primary">{eyebrow}</Text>
          ) : null}
          <Text className="font-bold text-display-sm text-on-surface">{title}</Text>
          {description ? (
            <Text className="font-sans text-label-md text-on-surface-variant">
              {description}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

const METRIC_TONES = {
  primary: {
    iconSurface: 'bg-primary-container',
    icon: 'text-on-primary-container',
  },
  success: {
    iconSurface: 'bg-success-container',
    icon: 'text-on-success-container',
  },
  warning: {
    iconSurface: 'bg-warning-container',
    icon: 'text-on-warning-container',
  },
  error: {
    iconSurface: 'bg-error-container',
    icon: 'text-on-error-container',
  },
} as const;

export function AdminMetricCard({
  icon,
  label,
  value,
  helper,
  tone = 'primary',
  style,
}: {
  icon: IconName;
  label: string;
  value: string;
  helper: string;
  tone?: keyof typeof METRIC_TONES;
  style?: ViewProps['style'];
}) {
  const colors = METRIC_TONES[tone];

  return (
    <View
      className="min-h-40 justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      style={style}
    >
      <View className={`h-11 w-11 items-center justify-center rounded-lg ${colors.iconSurface}`}>
        <MaterialIcons name={icon} size={23} className={colors.icon} />
      </View>
      <View className="gap-1">
        <Text className="font-bold text-numeric-lg text-on-surface">{value}</Text>
        <Text className="font-medium text-label-md text-on-surface">{label}</Text>
        <Text className="font-sans text-label-sm text-on-surface-variant">{helper}</Text>
      </View>
    </View>
  );
}

const STATUS_TONES = {
  PENDING: {
    surface: 'bg-warning-container',
    text: 'text-on-warning-container',
    icon: 'schedule' as const,
  },
  ACTIVE: {
    surface: 'bg-success-container',
    text: 'text-on-success-container',
    icon: 'check-circle' as const,
  },
  BLOCKED: {
    surface: 'bg-error-container',
    text: 'text-on-error-container',
    icon: 'block' as const,
  },
  PUBLISHED: {
    surface: 'bg-success-container',
    text: 'text-on-success-container',
    icon: 'public' as const,
  },
  DRAFT: {
    surface: 'bg-surface-container',
    text: 'text-on-surface-variant',
    icon: 'edit-note' as const,
  },
  HIDDEN: {
    surface: 'bg-warning-container',
    text: 'text-on-warning-container',
    icon: 'visibility-off' as const,
  },
  CANCELLED: {
    surface: 'bg-error-container',
    text: 'text-on-error-container',
    icon: 'event-busy' as const,
  },
} as const;

export function AdminStatusBadge({
  status,
  label,
}: {
  status: keyof typeof STATUS_TONES;
  label: string;
}) {
  const colors = STATUS_TONES[status];

  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${colors.surface}`}
    >
      <MaterialIcons name={colors.icon} size={13} className={colors.text} />
      <Text className={`font-medium text-label-sm ${colors.text}`}>{label}</Text>
    </View>
  );
}

export function AdminSectionHeader({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-semibold text-headline-md text-on-surface">{title}</Text>
        {description ? (
          <Text className="font-sans text-label-sm text-on-surface-variant">
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          className="min-h-touch-target-min justify-center rounded-full px-3 active:bg-primary/10"
        >
          <Text className="font-semibold text-label-md text-primary">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminIconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest active:bg-surface-container"
    >
      <MaterialIcons name={icon} size={22} className="text-on-surface" />
    </Pressable>
  );
}
