import type { Metadata } from 'next';
import { site } from '@/content/site';
import { PrivacyPolicy } from '@/features/privacy/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Privacy policy',
  // Hidden from search until the client supplies the policy text (spec §12 Q3).
  robots: site.privacyPolicy ? undefined : { index: false },
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
