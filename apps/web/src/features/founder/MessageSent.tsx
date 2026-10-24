'use client';

import { useEffect, useRef } from 'react';
import { Piko } from '@/components/site/Piko';
import { Button } from '@/components/ui/Button';
import { PREVIEW_MODE, PREVIEW_NOTHING_SAVED } from '@/lib/preview';

export const SENT_TITLE_ID = 'founder-sent-title';

/** W17 "Thanks, {firstName}. …" sentence (`30:1837`). */
export function sentMessage(firstName: string): string {
  const first = firstName.trim();
  const thanks = first ? `Thanks, ${first}.` : 'Thanks.';
  if (PREVIEW_MODE) return `${thanks} ${PREVIEW_NOTHING_SAVED}`;
  return `${thanks} Your message is on its way to connect@stepq.in. The founder reads every message personally.`;
}

/** W17 Message sent (`30:1577`), shown in place of the W16 form. */
export function MessageSent({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  // The form (and the focused Send button) just went away: keep focus inside the dialog.
  useEffect(() => root.current?.querySelector('button')?.focus(), []);
  return (
    <div ref={root} className="flex flex-col items-center gap-[18px] text-center">
      <Piko mood="cheer" size={150} motion="cheer" />
      <h2 id={SENT_TITLE_ID} className="type-web-h2 text-ink">
        Message sent
      </h2>
      <p role="status" className="type-web-body text-muted">
        {sentMessage(firstName)}
      </p>
      <Button className="w-full" onClick={onDone}>
        Back to StepQ
      </Button>
    </div>
  );
}
