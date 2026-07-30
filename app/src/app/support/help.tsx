import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { SupportScreenShell } from '@/components/support/support-screen-shell';

const FAQ_ITEMS = [
  { id: 'discover', icon: 'search' },
  { id: 'pendingPayment', icon: 'schedule' },
  { id: 'cancelPending', icon: 'cancel' },
  { id: 'ticketIssued', icon: 'confirmation-number' },
  { id: 'ticketQr', icon: 'qr-code-2' },
  { id: 'ticketStatus', icon: 'verified' },
  { id: 'eventChanged', icon: 'event-busy' },
  { id: 'featuredEvent', icon: 'star-outline' },
] as const satisfies readonly {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[];

export default function HelpCenterScreen() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(FAQ_ITEMS[0].id);

  return (
    <SupportScreenShell
      title={t('support.help.title')}
      description={t('support.help.description')}
    >
      <View className="flex-row items-center gap-3 rounded-xl bg-primary-container p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest">
          <MaterialIcons name="lightbulb-outline" size={23} className="text-primary" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-semibold text-body-md text-on-primary-container">
            {t('support.help.guideTitle')}
          </Text>
          <Text className="font-sans text-label-md leading-5 text-on-primary-container">
            {t('support.help.guideDescription')}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-semibold text-headline-md text-on-surface">
          {t('support.help.faqTitle')}
        </Text>

        {FAQ_ITEMS.map((item) => {
          const expanded = expandedId === item.id;

          return (
            <View
              key={item.id}
              className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? null : item.id)}
                className="min-h-touch-target-min flex-row items-center gap-3 p-4 active:bg-surface-container-low"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                  <MaterialIcons
                    name={item.icon}
                    size={21}
                    className="text-on-surface-variant"
                  />
                </View>
                <Text className="min-w-0 flex-1 font-medium text-body-md text-on-surface">
                  {t(`support.help.items.${item.id}.question`)}
                </Text>
                <MaterialIcons
                  name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={23}
                  className="text-outline"
                />
              </Pressable>

              {expanded ? (
                <View className="border-t border-outline-variant bg-surface-container-low px-4 py-3">
                  <Text className="font-sans text-body-md leading-6 text-on-surface-variant">
                    {t(`support.help.items.${item.id}.answer`)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </SupportScreenShell>
  );
}
