import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function TicketsScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      icon="confirmation-number"
      title={t('tickets.emptyTitle')}
      description={t('tickets.emptyDescription')}
      // An attendee with no tickets is one tap from the thing that fixes that.
      action={
        <Button
          variant="outline"
          label={t('tickets.emptyAction')}
          onPress={() => router.replace('/')}
        />
      }
    />
  );
}
