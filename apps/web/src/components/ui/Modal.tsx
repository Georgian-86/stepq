'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/lib/useReducedMotion';

const FOCUSABLE =
  'a[href],area[href],button,input:not([type="hidden"]),select,textarea,iframe,[tabindex],[contenteditable="true"]';

const EXIT_MS = 140;

/** True when the element (and every ancestor) is rendered: not display:none / hidden / invisible. */
function isRendered(el: HTMLElement): boolean {
  const check = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (typeof check === 'function') return check.call(el, { visibilityProperty: true });
  // Fallback for environments without layout APIs (jsdom).
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

/** Tabbable elements in DOM order: no tabindex=-1, nothing disabled, inert or unrendered. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLButtonElement).disabled &&
      !el.closest('[inert],fieldset[disabled]') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      isRendered(el),
  );
}

/** Keeps Tab / Shift+Tab inside `root`. Returns true when it handled the key. */
export function trapTab(e: KeyboardEvent | ReactKeyboardEvent, root: HTMLElement): boolean {
  if (e.key !== 'Tab') return false;
  const items = focusableIn(root);
  if (items.length === 0) {
    e.preventDefault();
    root.focus();
    return true;
  }
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
    return true;
  }
  if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Dialog over a dimmed page (W02/W03/W07/W10/W16/W17): overlay ink 45 %, 560 px card,
 * radius 28, padding 40, card shadow. Focus is trapped, Esc and overlay click close,
 * focus returns to the opener. Enter: fade + 12 px rise 200 ms; exit 140 ms.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const card = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Capture the opener during render, before children commit (an autoFocus child would
  // otherwise already have taken focus by the time an effect runs).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMounted(true);
      if (typeof document !== 'undefined') {
        opener.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
    }
  }

  // Exit: keep the DOM for the exit animation, then unmount.
  useEffect(() => {
    if (open || !mounted) return;
    if (reduced) {
      setMounted(false);
      return;
    }
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted, reduced]);

  // Open: remember the opener, focus inside, lock scroll, listen for Esc / Tab.
  useEffect(() => {
    if (!open) return;
    const root = card.current;
    if (root && !root.contains(document.activeElement)) {
      const auto = root.querySelector<HTMLElement>('[data-autofocus]');
      (auto ?? focusableIn(root)[0] ?? root).focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      } else if (card.current) {
        trapTab(e, card.current);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const back = opener.current;
      if (back && back.isConnected) back.focus();
    };
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center sm:p-m">
      <div
        data-testid="modal-overlay"
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
        className={`fixed inset-0 bg-ink/45 ${open ? 'animate-fade-in' : 'animate-fade-out'}`}
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative z-10 my-auto w-full max-w-[560px] rounded-t-(--radius-form) bg-white p-l shadow-card outline-none sm:rounded-(--radius-form) sm:p-[40px] ${
          open ? 'animate-modal-in' : 'animate-modal-out'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
