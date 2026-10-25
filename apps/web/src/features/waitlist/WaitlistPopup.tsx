'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Piko } from '@/components/site/Piko';
import { Modal } from '@/components/ui/Modal';
import { WaitlistForm } from './WaitlistCard';
import { useWaitlist } from './WaitlistState';

/** How long after landing the pop-up appears (client request). */
export const POPUP_DELAY_MS = 5000;
/** Lets the end-to-end test see the pop-up in an automated browser. */
export const FORCE_KEY = 'stepq.popup.force';

/** Pages where a sales pop-up would get in the way. */
const QUIET_PATHS = [/^\/confirm/, /^\/privacy/, /\/sent$/, /\/thank-you$/, /\/received$/];

function forced(): boolean {
  try {
    return window.localStorage.getItem(FORCE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Whether, right now, the pop-up may open. Re-checked when the timer fires. */
export function popupAllowed(pathname: string): boolean {
  if (QUIET_PATHS.some((re) => re.test(pathname))) return false;
  // Automated browsers (tests, Lighthouse, crawlers) don't get it unless a test asks.
  if (navigator.webdriver && !forced()) return false;
  // Not on top of another dialog, and not while someone is already using the page's form.
  if (document.querySelector('[role="dialog"]')) return false;
  if (new URLSearchParams(window.location.search).has('modal')) return false;
  if (document.activeElement?.closest('#waitlist')) return false;
  return true;
}

/**
 * The timed waitlist pop-up (client request, not in Figma): 5 s after every page load,
 * including refreshes; closing it hides it until the next load. Skipped for people who already
 * joined, who are using the page's waitlist form, on quiet pages, and when another dialog is
 * open. Joining from it opens W02 (reserve a username) as usual.
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
      setOpen(true);
    }, POPUP_DELAY_MS);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('focusin', onFocus);
    };
  }, [loaded, join, pathname]);

  const dismiss = () => setOpen(false);

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
