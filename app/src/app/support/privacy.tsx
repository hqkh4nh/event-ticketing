import { useTranslation } from 'react-i18next';

import {
  LegalDocumentScreen,
  type LegalSection,
} from '@/components/support/legal-document-screen';

const SECTION_IDS = [
  'collection',
  'purpose',
  'payment',
  'sharing',
  'retention',
  'security',
  'rights',
  'changes',
] as const;

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const sections: LegalSection[] = SECTION_IDS.map((id) => ({
    id,
    title: t(`support.privacy.sections.${id}.title`),
    body: t(`support.privacy.sections.${id}.body`),
  }));

  return (
    <LegalDocumentScreen
      icon="privacy-tip"
      title={t('support.privacy.title')}
      description={t('support.privacy.description')}
      updatedAt={t('support.common.updatedAt')}
      notice={t('support.privacy.notice')}
      sections={sections}
    />
  );
}
