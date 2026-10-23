import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { GUTTER } from '@/components/site/links';
import { Piko } from '@/components/site/Piko';
import { buttonClass } from '@/components/ui/Button';
import { ThankYouMessage } from '@/features/fund/ThankYouMessage';

export const metadata: Metadata = {
  title: 'Thank you for backing StepQ',
  robots: { index: false },
};

/** W08 Thank you for backing (`10:709`), at `/fund/thank-you?amount=<rupees>`. */
export default function ThankYouPage() {
  return (
    <section
      aria-labelledby="thanks-title"
      className={`mx-auto flex max-w-[1440px] flex-col items-center gap-[20px] py-[72px] lg:py-[120px] ${GUTTER}`}
    >
      <Piko mood="cheer" size={156} motion="cheer" />
      <h1
        id="thanks-title"
        className="type-web-h1 text-center tracking-[-1px] text-ink max-md:text-[36px] max-md:leading-[42px]"
      >
        Thank you for backing StepQ
      </h1>
      <Suspense fallback={<p className="type-web-lead min-h-[60px]" />}>
        <ThankYouMessage />
      </Suspense>
      <Link href="/" className={buttonClass('primary')}>
        Back to home
      </Link>
    </section>
  );
}
