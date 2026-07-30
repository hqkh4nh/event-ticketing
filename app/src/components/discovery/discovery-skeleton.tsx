import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`rounded-ctl bg-surface-container ${className}`} />;
}

function CompactPlaceholder() {
  return (
    <View className="w-[260px] overflow-hidden rounded-card border border-outline-variant bg-surface-container-lowest">
      <SkeletonBlock className="h-[146px] rounded-none" />
      <View className="gap-2 p-3">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-4 w-1/3" />
      </View>
    </View>
  );
}

function ResultPlaceholder() {
  return (
    <View className="min-h-28 flex-row items-center gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-2">
      <SkeletonBlock className="h-28 w-[104px]" />
      <View className="flex-1 gap-2">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-1/3" />
      </View>
    </View>
  );
}

/** Static loading composition; it intentionally has no animation for motion-sensitive users. */
export function DiscoverySkeleton() {
  const { t } = useTranslation();

  return (
    <View accessibilityLabel={t('home.loading')} accessibilityRole="progressbar" className="gap-6">
      <View className="gap-3">
        <SkeletonBlock className="h-7 w-32" />
        <View style={{ aspectRatio: 4 / 3 }}>
          <SkeletonBlock className="h-full w-full rounded-card" />
        </View>
      </View>

      <View className="gap-3">
        <SkeletonBlock className="h-7 w-40" />
        <View className="flex-row gap-3 overflow-hidden">
          <CompactPlaceholder />
          <CompactPlaceholder />
        </View>
      </View>

      <View className="gap-3">
        <SkeletonBlock className="h-7 w-28" />
        <ResultPlaceholder />
        <ResultPlaceholder />
        <ResultPlaceholder />
      </View>
    </View>
  );
}
