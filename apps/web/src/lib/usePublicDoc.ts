'use client';

import { useEffect, useState } from 'react';

/**
 * Live data of a public Firestore doc (`public/stats`, `public/backers`): `undefined` until the
 * first snapshot (or if the listener fails), `null` when the doc does not exist. Firebase is
 * loaded lazily so it stays out of the first paint.
 */
export function usePublicDoc<T extends object>(id: 'stats' | 'backers'): T | null | undefined {
  const [data, setData] = useState<T | null | undefined>(undefined);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import('firebase/firestore'), import('./firebase')]).then(
      ([{ doc, onSnapshot }, { db }]) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, 'public', id),
          (snap) => setData(snap.exists() ? (snap.data() as T) : null),
          () => {}, // offline / blocked: keep showing nothing rather than a wrong number
        );
      },
    );
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [id]);

  return data;
}
