'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { call } from '@/lib/api';
import { removeParams } from '@/lib/useModalParam';

export const INVALID_LINK = 'This link is not valid.';

type State =
  | { step: 'loading' }
  | { step: 'ready'; summary: string; confirming: boolean; error: string | null }
  | { step: 'done'; summary: string }
  | { step: 'already'; summary: string }
  | { step: 'error'; message: string };

const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : INVALID_LINK);

/**
 * Signed action link from a founder email (`/confirm?token=…`). The token leaves the address
 * bar at once (kept in memory only). Loading only describes the action; it happens when
 * "Confirm" is pressed, so link scanners and prefetchers that GET the page change nothing.
 */
export function ConfirmAction() {
  const token = useRef<string | null | undefined>(undefined);
  const inFlight = useRef(false);
  const [state, setState] = useState<State>({ step: 'loading' });

  useEffect(() => {
    // Read once (a Strict Mode re-run must not see the already-cleaned URL as "no token").
    if (token.current === undefined) {
      token.current = new URLSearchParams(window.location.search).get('token') || null;
      removeParams(['token']);
    }
    const t = token.current;
    if (!t) {
      setState({ step: 'error', message: INVALID_LINK });
      return;
    }
    let live = true;
    call('describeAction', { token: t }).then(
      (res) => {
        if (!live) return;
        setState(
          res.done
            ? { step: 'already', summary: res.summary }
            : { step: 'ready', summary: res.summary, confirming: false, error: null },
        );
      },
      (e: unknown) => live && setState({ step: 'error', message: errorMessage(e) }),
    );
    return () => {
      live = false;
    };
  }, []);

  async function confirm() {
    if (state.step !== 'ready' || !token.current || inFlight.current) return;
    inFlight.current = true;
    const { summary } = state;
    setState({ step: 'ready', summary, confirming: true, error: null });
    try {
      await call('confirmAction', { token: token.current });
      setState({ step: 'done', summary });
    } catch (e) {
      setState({ step: 'ready', summary, confirming: false, error: errorMessage(e) });
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div
      aria-live="polite"
      className="flex w-full max-w-[560px] flex-col items-center gap-[18px] rounded-(--radius-form) bg-white p-l text-center shadow-card sm:p-[40px]"
    >
      {state.step === 'loading' && (
        <>
          <h1 className="type-web-h2 text-ink">Confirm</h1>
          <p className="type-web-body text-muted">Checking this link…</p>
        </>
      )}
      {state.step === 'ready' && (
        <>
          <h1 className="type-web-h2 text-ink">Confirm</h1>
          <p className="type-web-lead text-ink">{state.summary}</p>
          <Button className="w-full" loading={state.confirming} onClick={confirm}>
            Confirm
          </Button>
          {state.error && (
            <p role="alert" className="type-web-small text-tomato-text">
              {state.error}
            </p>
          )}
        </>
      )}
      {(state.step === 'done' || state.step === 'already') && (
        <>
          <span className="flex rounded-pill bg-leaf-soft p-m">
            <Icon name="check-large-deep" />
          </span>
          <h1 className="type-web-h2 text-ink">
            {state.step === 'done' ? 'Done' : 'Already done'}
          </h1>
          <p className="type-web-body text-muted">
            {state.step === 'done'
              ? "It's confirmed. You can close this page."
              : 'This was confirmed earlier, so nothing changed.'}
          </p>
          <Link href="/" className={buttonClass('primary', 'w-full')}>
            Back to home
          </Link>
        </>
      )}
      {state.step === 'error' && (
        <>
          <h1 className="type-web-h2 text-ink">Can&apos;t use this link</h1>
          <p className="type-web-body text-muted">{state.message}</p>
          <Link href="/" className={buttonClass('primary', 'w-full')}>
            Back to home
          </Link>
        </>
      )}
    </div>
  );
}
