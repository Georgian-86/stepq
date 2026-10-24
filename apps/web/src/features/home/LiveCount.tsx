'use client';

import { Icon } from '@/components/ui/Icon';
import { usePublicDoc } from '@/lib/usePublicDoc';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useCountUp } from './useCountUp';

const format = (n: number) => n.toLocaleString('en-IN');
const ONE = 'person has joined the waitlist';
const MANY = 'people have joined the waitlist';

export const liveCountSentence = (n: number) => `${format(n)} ${n === 1 ? ONE : MANY}`;

/**
 * Live waitlist count (W01 `9:112`), always the real `public/stats.waitlistCount`. The pill
 * is laid out in full but invisible until the first snapshot (never a sample number). Both
 * sentence endings share one grid cell. On phones (stacked layout) the number slot is sized
 * for 7 digits so the box never changes; from sm the number has its natural tabular width
 * right after the dot, as in Figma. The number rolls to new values;
 * screen readers get one polite sentence per change.
 */
export function LiveCount() {
  const stats = usePublicDoc<{ waitlistCount?: number }>('stats');
  const count = stats === undefined ? undefined : (stats?.waitlistCount ?? 0);
  const reduced = useReducedMotion();
  const shown = useCountUp(count, reduced);
  const ready = count !== undefined && shown !== undefined;
  const one = count === 1;

  return (
    <div>
      <p role="status" aria-atomic="true" className="sr-only">
        {count !== undefined ? liveCountSentence(count) : ''}
      </p>
      <div
        data-live-pill
        aria-hidden="true"
        className={`inline-flex max-w-full items-center gap-[12px] rounded-l bg-white px-m py-[12px] sm:rounded-pill sm:px-[18px] ${
          ready ? 'animate-fade-in' : 'invisible'
        }`}
      >
        <Icon name="live-dot-deep" className="live-dot" />
        {/* Phones: number above the sentence; wider: one line. Same box either way. */}
        <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-[12px]">
          {/* Phones only: a ::before sizer reserves 7 digits in en-IN grouping ("00,00,000"),
              so the stacked box never changes size. From sm the number has its natural width,
              left-aligned after the dot as in Figma. */}
          <span className="type-web-h3 grid text-ink tabular-nums max-sm:before:invisible max-sm:before:col-start-1 max-sm:before:row-start-1 max-sm:before:content-['00,00,000']">
            <span className="col-start-1 row-start-1">{ready ? format(shown) : ''}</span>
          </span>
          <span className="type-web-body grid text-ink">
            <span className={`col-start-1 row-start-1 ${one ? '' : 'invisible'}`}>{ONE}</span>
            <span className={`col-start-1 row-start-1 ${one ? 'invisible' : ''}`}>{MANY}</span>
          </span>
        </span>
        {/* Figma fills this with leaf-soft, where deep text is 4.49:1 (under WCAG AA 4.5:1);
            mint keeps the look at 4.63:1. */}
        <span className="type-web-small-strong rounded-pill bg-mint px-s py-[2px] text-deep">
          Live
        </span>
      </div>
    </div>
  );
}
