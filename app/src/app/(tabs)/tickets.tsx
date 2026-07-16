import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function TicketsScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      icon="confirmation-number"
      title={t('tickets.emptyTitle')}
      description={t('tickets.emptyDescription')}
    />
  );
}
