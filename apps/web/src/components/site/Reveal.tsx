'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const STAGGER_MS = 60;

/**
 * Fades content in with a 12 px rise when it scrolls into view (spec §7). Server HTML is
 * fully visible; only after hydration, and only for elements still below the fold, is the
 * element hidden and then revealed. Skipped entirely under reduced motion.
 */
export function Reveal({
  children,
  index = 0,
  className = '',
}: {
  children: ReactNode;
  /** Position in a staggered group: delay = index × 60 ms. */
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible: leave it
    el.dataset.reveal = 'pending';
    el.style.transitionDelay = `${index * STAGGER_MS}ms`;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.dataset.reveal = 'shown';
        io.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
