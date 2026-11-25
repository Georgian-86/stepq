import type { Metadata } from 'next';
import { COOKIE_POLICY } from '@/content/legal';
import { LegalPage } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'Every cookie and browser storage item stepq.in uses, why, and for how long.',
};

export default function CookiesPage() {
  return <LegalPage title="Cookie policy" markdown={COOKIE_POLICY} />;
}
