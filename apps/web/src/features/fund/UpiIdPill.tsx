'use client';

import { useEffect, useState } from 'react';
import { HIT_44 } from '@/components/site/links';
import { UPI_ID } from './upi';

const RESET_MS = 2500;
const RESULT = { copied: 'Copied', failed: 'Couldn’t copy — select the ID' } as const;

/**
 * "UPI ID bhakti0parmar1@oksbi" pill (W06 `30:1274`, W07 `10:667`) with "Copy UPI ID" (spec §7).
 * The button's name never changes; the result ("Copied" / failure) is a status message.
 */
export function UpiIdPill({ className = '' }: { className?: string }) {
  const [result, setResult] = useState<keyof typeof RESULT | null>(null);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), RESET_MS);
    return () => clearTimeout(t);
  }, [result]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setResult('copied');
    } catch {
      setResult('failed');
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-m gap-y-xs ${className}`}>
      <p className="type-web-small flex gap-s rounded-pill bg-mint px-[14px] py-s whitespace-nowrap">
        <span className="text-muted">UPI ID</span>
        <span className="type-web-small-strong text-ink select-all">{UPI_ID}</span>
      </p>
      <button type="button" onClick={copy} className={`type-web-small-strong text-deep ${HIT_44}`}>
        Copy UPI ID
      </button>
      <span
        role="status"
        className={`type-web-small ${result === 'failed' ? 'text-tomato-text' : 'text-muted'}`}
      >
        {result ? RESULT[result] : ''}
      </span>
    </div>
  );
}
