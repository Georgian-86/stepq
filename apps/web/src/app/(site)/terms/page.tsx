import type { Metadata } from 'next';
import { TERMS } from '@/content/legal';
import { LegalPage } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The rules for using StepQ and its community, and what you and StepQ agree to.',
};

export default function TermsPage() {
  return <LegalPage title="Terms of use" markdown={TERMS} />;
}
