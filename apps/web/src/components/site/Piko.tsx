'use client';

import { pikoSvg, type PikoMood } from '@stepq/brand';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

export type PikoMotion = 'walk' | 'cheer' | 'none';

/**
 * Piko, the StepQ mascot (Figma `4:265`), from the exported SVGs. `walk` loops and pauses
 * while off-screen; `cheer` bounces once. No motion at all under prefers-reduced-motion.
 * The SVG keeps its square viewBox and scales to `size`.
 */
export function Piko({
  mood,
  size,
  motion = 'none',
  label,
  className = '',
}: {
  mood: PikoMood;
  size: number;
  motion?: PikoMotion;
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const animate = !reduced && motion !== 'none';

  useEffect(() => {
    if (!animate || motion !== 'walk' || !ref.current) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry?.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, [animate, motion]);

  return (
    <span
      ref={ref}
      className={`inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${
        animate ? `piko-${motion}` : ''
      } ${className}`}
      style={{ width: size, height: size }}
      data-paused={animate && offscreen ? '' : undefined}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: pikoSvg[mood] }}
    />
  );
}
