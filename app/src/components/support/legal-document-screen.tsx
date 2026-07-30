import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { DetailScreenShell } from '@/components/ui/detail-screen-shell';

export type LegalSection = {
  id: string;
  title: string;
  body: string;
};

type LegalDocumentScreenProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  updatedAt: string;
  notice: string;
  sections: LegalSection[];
};

export function LegalDocumentScreen({
  icon,
  title,
  description,
  updatedAt,
  notice,
  sections,
}: LegalDocumentScreenProps) {
  return (
    <DetailScreenShell title={title}>
      <View className="gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcons name={icon} size={22} className="text-on-primary-container" />
        </View>
        <Text className="font-sans text-body-md leading-6 text-on-surface">{description}</Text>
        <Text className="font-medium text-label-sm text-primary">{updatedAt}</Text>
      </View>

      <View className="flex-row gap-3 rounded-xl bg-surface-container p-4">
        <MaterialIcons name="info-outline" size={21} className="mt-0.5 text-primary" />
        <Text className="min-w-0 flex-1 font-sans text-label-md leading-5 text-on-surface-variant">
          {notice}
        </Text>
      </View>

      <View className="gap-3">
        {sections.map((section, index) => (
          <View
            key={section.id}
            className="gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-container">
                <Text className="font-semibold text-label-sm text-on-primary-container">
                  {index + 1}
                </Text>
              </View>
              <Text className="min-w-0 flex-1 font-semibold text-body-lg text-on-surface">
                {section.title}
              </Text>
            </View>
            <Text className="font-sans text-body-md leading-6 text-on-surface-variant">
              {section.body}
            </Text>
          </View>
        ))}
      </View>
    </DetailScreenShell>
  );
}
