'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { PREVIEW_MODE } from '@/lib/preview';

function send(event: { kind: 'view' | 'click'; path: string; label?: string; referrer?: string }) {
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
      return;
    }
    void fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {
    // Counting is best-effort; the page never depends on it.
  }
}

/** What a click was on: `data-track`, else the link or button's visible text, else its href. */
function labelOf(el: HTMLElement): string {
  const text = el.dataset.track ?? el.getAttribute('aria-label') ?? el.textContent ?? '';
  const label = text.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (label) return label;
  return el instanceof HTMLAnchorElement ? (el.getAttribute('href') ?? '') : '';
}

/**
 * Anonymous page views and link / button clicks for the admin Stats page (see /api/track):
 * no cookies, no identifiers. Off in preview builds, which have no backend.
 */
export function Tracker() {
  const path = usePathname();

  useEffect(() => {
    if (PREVIEW_MODE) return;
    send({ kind: 'view', path, referrer: document.referrer || undefined });
  }, [path]);

  useEffect(() => {
    if (PREVIEW_MODE) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('a, button, [data-track]');
      if (!el) return;
      send({ kind: 'click', path: location.pathname, label: labelOf(el) });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
