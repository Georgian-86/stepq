'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Piko } from '@/components/site/Piko';
import { Modal } from '@/components/ui/Modal';
import { WaitlistForm } from './WaitlistCard';
import { useWaitlist } from './WaitlistState';

/** How long after landing the pop-up appears (client request). */
export const POPUP_DELAY_MS = 5000;
/** After someone closes it, it stays away this long. */
export const POPUP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const SHOWN_KEY = 'stepq.popup.shown';
export const SNOOZE_KEY = 'stepq.popup.snoozedAt';
/** Lets the end-to-end test see the pop-up in an automated browser. */
export const FORCE_KEY = 'stepq.popup.force';

/** Pages where a sales pop-up would get in the way. */
const QUIET_PATHS = [/^\/confirm/, /^\/privacy/, /\/sent$/, /\/thank-you$/, /\/received$/];

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Whether, right now, the pop-up may open. Re-checked when the timer fires. */
export function popupAllowed(pathname: string, now = Date.now()): boolean {
  if (QUIET_PATHS.some((re) => re.test(pathname))) return false;
  const forced = storage('local')?.getItem(FORCE_KEY) === '1';
  // Automated browsers (tests, Lighthouse, crawlers) don't get it unless a test asks.
  if (navigator.webdriver && !forced) return false;
  if (storage('session')?.getItem(SHOWN_KEY)) return false;
  const snoozed = Number(storage('local')?.getItem(SNOOZE_KEY) ?? 0);
  if (snoozed && now - snoozed < POPUP_SNOOZE_MS) return false;
  // Not on top of another dialog, and not while someone is already using the page's form.
  if (document.querySelector('[role="dialog"]')) return false;
  if (new URLSearchParams(window.location.search).has('modal')) return false;
  if (document.activeElement?.closest('#waitlist')) return false;
  return true;
}

/**
 * The timed waitlist pop-up (client request, not in Figma): 5 s after landing, once per visit,
 * and not again for 7 days after it's closed. Skipped for people who already joined, who are
 * using the page's waitlist form, on quiet pages, and when another dialog is open. Joining
 * from it opens W02 (reserve a username) as usual.
 */
export function WaitlistPopup() {
  const pathname = usePathname();
  const { join, loaded } = useWaitlist();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loaded || join) return;
    let cancelled = false;
    // Someone who starts on the page's own form has found it: no pop-up.
    const onFocus = (e: FocusEvent) => {
      if ((e.target as Element | null)?.closest?.('#waitlist')) cancelled = true;
    };
    document.addEventListener('focusin', onFocus);
    const t = window.setTimeout(() => {
      if (cancelled || !popupAllowed(pathname)) return;
      storage('session')?.setItem(SHOWN_KEY, '1');
      setOpen(true);
    }, POPUP_DELAY_MS);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('focusin', onFocus);
    };
  }, [loaded, join, pathname]);

  function dismiss() {
    storage('local')?.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  return (
    <Modal open={open} onClose={dismiss} labelledBy="popup-waitlist-title">
      <div className="flex flex-col items-center">
        <Piko mood="happy" size={96} motion="cheer" className="mb-s" />
      </div>
      <WaitlistForm
        idPrefix="popup"
        headingId="popup-waitlist-title"
        onJoined={() => setOpen(false)}
      />
      <div className="mt-s flex justify-center">
        <button
          type="button"
          onClick={dismiss}
          className="type-web-body-strong inline-flex min-h-[44px] items-center px-xs text-deep"
        >
          Not now
        </button>
      </div>
    </Modal>
  );
}
