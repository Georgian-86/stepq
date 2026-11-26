import type { Metadata } from 'next';
import { GRIEVANCE } from '@/content/legal';
import { LegalPage } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Grievance officer',
  description: 'How to complain about your data or content on StepQ, and how fast we respond.',
};

export default function GrievancePage() {
  return <LegalPage title="Grievance officer" markdown={GRIEVANCE} />;
}
