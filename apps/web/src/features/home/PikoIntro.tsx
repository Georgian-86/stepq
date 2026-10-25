'use client';

import { useEffect, useState } from 'react';
import { Piko, type PikoMotion } from '@/components/site/Piko';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Piko's handwritten introduction (client request, not in Figma). */
export const PIKO_HELLO = "Hi, I'm Piko!";
export const PIKO_PROMISE = "I'll walk every step with you.";

/**
 * The hero Piko with a handwritten note beside him: "Hi, I'm Piko!" and a hand-drawn arrow
 * pointing at him, in white on the leaf green, like a doodle on a poster. On load the arrow
 * draws itself and the words write in once (CSS, transform/opacity/stroke only). Tapping Piko
 * makes him cheer and the note gives a small wiggle. Under reduced motion everything is shown
 * statically.
 *
 * White on leaf is about 2.3:1, below WCAG AA, so the handwriting is presented as decoration
 * (aria-hidden) and the same words are given to assistive tech as plain text. Client's call:
 * white matches their reference; an ink version would pass AA if they prefer.
 */
export function PikoIntro() {
  const reduced = useReducedMotion();
  const [motion, setMotion] = useState<PikoMotion>('walk');
  const [pokes, setPokes] = useState(0);

  // A tap ends with a cheer bounce, then Piko goes back to walking.
  useEffect(() => {
    if (motion !== 'cheer') return;
    const t = window.setTimeout(() => setMotion('walk'), 700);
    return () => window.clearTimeout(t);
  }, [motion]);

  function poke() {
    if (reduced) return;
    setMotion('cheer');
    setPokes((n) => n + 1);
  }

  return (
    <div data-piko-intro className="relative flex items-start">
      <button
        type="button"
        onClick={poke}
        aria-label="Say hi to Piko"
        className="shrink-0 rounded-l focus-visible:outline-offset-4"
      >
        <Piko
          key={motion}
          mood="cheer"
          size={264}
          motion={motion}
          className="max-lg:size-[160px]!"
        />
      </button>
      <div
        data-piko-note
        className={`relative mt-[8px] -ml-[4px] flex items-start text-white lg:mt-[4px] ${
          pokes % 2 ? 'piko-note-wiggle' : pokes ? 'piko-note-wiggle-2' : ''
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 64 56"
          className="piko-arrow mt-[30px] h-[44px] w-[52px] shrink-0 lg:mt-[40px] lg:h-[56px] lg:w-[64px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path pathLength={1} d="M60 8 C 44 6, 22 14, 10 40" />
          <path pathLength={1} className="piko-arrow-head" d="M6 26 L 10 41 L 23 34" />
        </svg>
        <p className="sr-only">
          {PIKO_HELLO} {PIKO_PROMISE}
        </p>
        <p data-piko-handwriting aria-hidden="true" className="font-hand -rotate-6 leading-none">
          <span className="piko-write block text-[30px] lg:text-[40px]">{PIKO_HELLO}</span>
          <span className="piko-write piko-write-late mt-[6px] block text-[17px] leading-[22px] lg:text-[22px] lg:leading-[28px]">
            {PIKO_PROMISE}
          </span>
        </p>
      </div>
    </div>
  );
}
