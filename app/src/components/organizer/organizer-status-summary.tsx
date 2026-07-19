import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { NumericText } from '@/components/ui/numeric-text';
import type { OrganizerEventSummary } from '@/lib/api/events-organizer';

type Counts = Record<OrganizerEventSummary['status'], number> & {
  total: number;
};

export function OrganizerStatusSummary({
  events,
}: {
  events: OrganizerEventSummary[];
}) {
  const { t } = useTranslation();
  const counts = summarize(events);

  return (
    <View className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <View className="flex-row border-b border-outline-variant">
        <View className="flex-1 border-r border-outline-variant">
          <StatusMetric
            icon="event-note"
            label={t('organizer.dashboard.total')}
            value={counts.total}
          />
        </View>
        <View className="flex-1">
          <StatusMetric
            icon="check-circle"
            label={t('organizer.dashboard.published')}
            value={counts.PUBLISHED}
            tone="primary"
          />
        </View>
      </View>
      <View className="flex-row">
        <View className="flex-1 border-r border-outline-variant">
          <StatusMetric
            icon="edit-note"
            label={t('organizer.dashboard.draft')}
            value={counts.DRAFT}
          />
        </View>
        <View className="flex-1">
          <StatusMetric
            icon="cancel"
            label={t('organizer.dashboard.cancelled')}
            value={counts.CANCELLED}
          />
        </View>
      </View>
    </View>
  );
}

function StatusMetric({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: number;
  tone?: 'neutral' | 'primary';
}) {
  const iconTone = tone === 'primary' ? 'text-primary' : 'text-on-surface-variant';
  const iconSurface = tone === 'primary' ? 'bg-primary/10' : 'bg-surface-container';

  return (
    <View className="h-24 flex-row items-center gap-3 px-4">
      <View className={`h-10 w-10 items-center justify-center rounded ${iconSurface}`}>
        <MaterialIcons name={icon} size={20} className={iconTone} />
      </View>
      <View className="min-w-0 flex-1">
        <NumericText className="font-bold text-numeric-lg text-on-surface">
          {value}
        </NumericText>
        <Text numberOfLines={1} className="font-sans text-label-sm text-on-surface-variant">
          {label}
        </Text>
      </View>
    </View>
  );
}

function summarize(events: OrganizerEventSummary[]): Counts {
  return events.reduce<Counts>(
    (counts, event) => {
      counts.total += 1;
      counts[event.status] += 1;
      return counts;
    },
    {
      total: 0,
      DRAFT: 0,
      PUBLISHED: 0,
      CANCELLED: 0,
      HIDDEN: 0,
    },
  );
}
