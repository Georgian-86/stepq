import type { Metadata } from 'next';
import { DELETE_ACCOUNT } from '@/content/legal';
import { LegalPage } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Delete your StepQ account',
  description: 'How to delete your StepQ account and data, what is deleted and what is kept.',
};

export default function DeleteAccountPage() {
  return <LegalPage title="Delete your account" markdown={DELETE_ACCOUNT} />;
}
