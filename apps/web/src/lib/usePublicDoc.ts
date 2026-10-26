'use client';

import { useEffect, useState } from 'react';
import { PREVIEW_MODE } from './preview';

/** How often the home page refreshes the live count and the backers wall. */
export const PUBLIC_POLL_MS = Number(process.env.NEXT_PUBLIC_PUBLIC_POLL_MS) || 20_000;

/**
 * Live public data (`stats`: the waitlist count; `backers`: the wall), polled from
 * `/api/public/<id>` while the tab is visible: `undefined` until the first successful read
 * (and while it keeps failing), never a guessed value. Preview builds have no backend: every
 * doc reads as missing (live count 0, no backers wall).
 */
export function usePublicDoc<T extends object>(id: 'stats' | 'backers'): T | null | undefined {
  const [data, setData] = useState<T | null | undefined>(PREVIEW_MODE ? null : undefined);

  useEffect(() => {
    if (PREVIEW_MODE) return;
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/public/${id}`, { cache: 'no-store' });
        if (!res.ok) return; // offline / backend down: keep the last value rather than a wrong one
        const body = (await res.json()) as T;
        if (!cancelled) setData(body);
      } catch {
        // network error: keep the last value
      }
    };
    void load();
    const timer = window.setInterval(load, PUBLIC_POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [id]);

  return data;
}
