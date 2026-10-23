import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { GUTTER } from '@/components/site/links';
import { Piko } from '@/components/site/Piko';
import { buttonClass } from '@/components/ui/Button';
import { ApplicationSentMessage } from '@/features/team/ApplicationSent';

export const metadata: Metadata = {
  title: 'Application sent',
  robots: { index: false },
};

/** W05 Application sent (`10:268`). */
export default function ApplicationSentPage() {
  return (
    <section
      aria-labelledby="sent-title"
      className={`mx-auto flex max-w-[1440px] flex-col items-center gap-[20px] py-[72px] lg:py-[120px] ${GUTTER}`}
    >
      <Piko mood="cheer" size={156} motion="cheer" />
      <h1
        id="sent-title"
        className="type-web-h1 text-center tracking-[-1px] text-ink max-md:text-[36px] max-md:leading-[42px]"
      >
        Application sent
      </h1>
      <Suspense fallback={<p className="type-web-lead min-h-[60px]" />}>
        <ApplicationSentMessage />
      </Suspense>
      <Link href="/" className={buttonClass('primary')}>
        Back to home
      </Link>
    </section>
  );
}
