'use client';

import { usePathname } from 'next/navigation';
import { PREVIEW_MODE } from '@/lib/preview';
import { GUTTER } from './links';

/**
 * Preview builds only (`NEXT_PUBLIC_PREVIEW_MODE=1`): a slim note above the nav, scrolling
 * with the page. On the fund pages it adds that the UPI hand-off still pays for real.
 */
export function PreviewBanner() {
  const pathname = usePathname();
  if (!PREVIEW_MODE) return null;
  const fund = pathname === '/fund' || pathname?.startsWith('/fund/');

  return (
    <p role="note" className={`type-web-small bg-mango-soft py-s text-center text-ink ${GUTTER}`}>
      Preview — forms don&apos;t save anything yet.
      {fund && ' UPI payments made here are real.'}
    </p>
  );
}
