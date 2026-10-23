'use client';

import { useEffect, useState } from 'react';
import { HIT_44 } from '@/components/site/links';
import { UPI_ID } from './upi';

const COPIED_MS = 2000;

/** "UPI ID bhakti0parmar1@oksbi" pill (W06 `30:1274`, W07 `10:667`) with "Copy UPI ID" (spec §7). */
export function UpiIdPill({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
    } catch {
      // Clipboard blocked: the ID stays visible to copy by hand.
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-m gap-y-xs ${className}`}>
      <p className="type-web-small flex gap-s rounded-pill bg-mint px-[14px] py-s whitespace-nowrap">
        <span className="text-muted">UPI ID</span>
        <span className="type-web-small-strong text-ink">{UPI_ID}</span>
      </p>
      <button type="button" onClick={copy} className={`type-web-small-strong text-deep ${HIT_44}`}>
        {copied ? 'Copied' : 'Copy UPI ID'}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'UPI ID copied' : ''}
      </span>
    </div>
  );
}
