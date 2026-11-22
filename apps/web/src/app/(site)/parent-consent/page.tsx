import type { Metadata } from 'next';
import { GUTTER } from '@/components/site/links';
import { ParentConsent } from '@/features/parentConsent/ParentConsent';

export const metadata: Metadata = {
  title: 'Parental consent',
  robots: { index: false, follow: false },
};

/** A parent's answer to their teen's StepQ sign-up (link from the parentConsent email). */
export default function ParentConsentPage() {
  return (
    <section
      aria-label="Parental consent"
      className={`flex justify-center bg-page py-[72px] lg:py-[120px] ${GUTTER}`}
    >
      <ParentConsent />
    </section>
  );
}
