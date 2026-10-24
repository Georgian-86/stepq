import type { Metadata } from 'next';
import { GUTTER } from '@/components/site/links';
import { ConfirmAction } from '@/features/confirm/ConfirmAction';

export const metadata: Metadata = {
  title: 'Confirm',
  robots: { index: false, follow: false },
};

/** Signed action links from founder emails (approve an ambassador, verify a backing). */
export default function ConfirmPage() {
  return (
    <section
      aria-label="Confirm"
      className={`flex justify-center bg-page py-[72px] lg:py-[120px] ${GUTTER}`}
    >
      <ConfirmAction />
    </section>
  );
}
