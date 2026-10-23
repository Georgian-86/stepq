'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The displayed value of a live number: the first value appears as is, later changes roll
 * from the shown value to the new one (rAF, ~700 ms). Instant when `instant` (reduced motion).
 */
export function useCountUp(target: number | undefined, instant: boolean): number | undefined {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (target === undefined) return;
    const from = shownRef.current;
    const set = (v: number) => {
      shownRef.current = v;
      setShown(v);
    };
    if (instant || from === undefined || from === target) {
      set(target);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / DURATION_MS);
      set(Math.round(from + (target - from) * easeOut(p)));
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, instant]);

  return shown;
}
