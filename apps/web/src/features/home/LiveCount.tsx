'use client';

import { Icon } from '@/components/ui/Icon';
import { usePublicDoc } from '@/lib/usePublicDoc';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useCountUp } from './useCountUp';

const format = (n: number) => n.toLocaleString('en-IN');

/**
 * Live waitlist count (W01 `9:112`), always the real `public/stats.waitlistCount`. The pill
 * keeps its space but stays invisible until the first snapshot (never a sample number). The
 * number rolls to new values; screen readers get one polite sentence per change.
 */
export function LiveCount() {
  const stats = usePublicDoc<{ waitlistCount?: number }>('stats');
  const count = stats === undefined ? undefined : (stats?.waitlistCount ?? 0);
  const reduced = useReducedMotion();
  const shown = useCountUp(count, reduced);
  const ready = count !== undefined;

  return (
    <div>
      <p role="status" aria-atomic="true" className="sr-only">
        {ready ? `${format(count)} people have joined the waitlist` : ''}
      </p>
      <div
        data-live-pill
        aria-hidden="true"
        className={`inline-flex max-w-full items-center gap-s rounded-l bg-white px-m py-[12px] sm:gap-[12px] sm:rounded-pill sm:px-[18px] ${
          ready ? 'animate-fade-in' : 'invisible'
        }`}
      >
        <Icon name="live-dot-deep" className="live-dot" />
        <span className="flex flex-wrap items-baseline gap-x-s sm:gap-x-[12px]">
          <span className="type-web-h3 min-w-[1ch] text-ink tabular-nums">
            {ready && shown !== undefined ? format(shown) : '\u00a0'}
          </span>
          <span className="type-web-body text-ink">people have joined the waitlist</span>
        </span>
        <span className="type-web-small-strong rounded-pill bg-leaf-soft px-s py-[2px] text-deep">
          Live
        </span>
      </div>
    </div>
  );
}
