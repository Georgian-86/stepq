import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { GUTTER } from '@/components/site/links';
import { Piko } from '@/components/site/Piko';
import { buttonClass } from '@/components/ui/Button';
import { ReceivedMessage } from '@/features/ambassador/ReceivedMessage';

export const metadata: Metadata = {
  title: 'Application received',
  robots: { index: false },
};

/** W11 Ambassador application received (`10:918`), at `/ambassadors/received?name=`. */
export default function AmbassadorReceivedPage() {
  return (
    <section
      aria-labelledby="received-title"
      className={`mx-auto flex max-w-[1440px] flex-col items-center gap-[20px] py-[72px] lg:py-[120px] ${GUTTER}`}
    >
      <Piko mood="happy" size={156} motion="cheer" />
      <h1
        id="received-title"
        className="type-web-h1 text-center tracking-[-1px] text-ink max-md:text-[36px] max-md:leading-[42px]"
      >
        Application received
      </h1>
      <Suspense fallback={<p className="type-web-lead min-h-[60px]" />}>
        <ReceivedMessage />
      </Suspense>
      <Link href="/" className={buttonClass('primary')}>
        Back to home
      </Link>
    </section>
  );
}
