import type { Metadata } from 'next';
import { PrivacyPolicy } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What StepQ collects on stepq.in, why, where it is stored, and your rights.',
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
