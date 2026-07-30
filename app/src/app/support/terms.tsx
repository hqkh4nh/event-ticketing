import { useTranslation } from 'react-i18next';

import {
  LegalDocumentScreen,
  type LegalSection,
} from '@/components/support/legal-document-screen';

const SECTION_IDS = [
  'acceptance',
  'account',
  'organizer',
  'orders',
  'tickets',
  'cancellation',
  'prohibited',
  'changes',
] as const;

export default function TermsScreen() {
  const { t } = useTranslation();
  const sections: LegalSection[] = SECTION_IDS.map((id) => ({
    id,
    title: t(`support.terms.sections.${id}.title`),
    body: t(`support.terms.sections.${id}.body`),
  }));

  return (
    <LegalDocumentScreen
      icon="gavel"
      title={t('support.terms.title')}
      description={t('support.terms.description')}
      updatedAt={t('support.common.updatedAt')}
      notice={t('support.terms.notice')}
      sections={sections}
    />
  );
}
