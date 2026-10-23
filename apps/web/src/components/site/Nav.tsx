'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { buttonClass } from '../ui/Button';
import { trapTab } from '../ui/Modal';
import { GUTTER, NAV_LINKS, WAITLIST_HREF } from './links';
import { Wordmark } from './Wordmark';

/** Web nav / Before launch (Figma `9:16`). Links collapse into a menu sheet under 768 px. */
export function Nav() {
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = sheet.current?.querySelector<HTMLElement>('a,button');
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      } else if (sheet.current) {
        trapTab(e, sheet.current);
      }
    }
    // Close if the viewport grows past the breakpoint.
    const mql = window.matchMedia('(min-width: 768px)');
    const onWide = () => mql.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    mql.addEventListener?.('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      mql.removeEventListener?.('change', onWide);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="relative z-40 border-b border-line bg-white">
      <nav
        aria-label="Main"
        className={`mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-[28px] py-[10px] md:min-h-[136px] md:py-[18px] ${GUTTER}`}
      >
        <Link href="/" aria-label="StepQ home" className="flex items-center">
          <Wordmark />
        </Link>
        <div className="flex-1" />
        <ul className="hidden items-center gap-[28px] md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="type-web-small-strong inline-flex min-h-[44px] items-center px-xs text-ink hover:text-deep"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Link href={WAITLIST_HREF} className={buttonClass('primary')}>
            Join the waitlist
          </Link>
        </div>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={sheetId}
          onClick={() => setOpen((v) => !v)}
          className="type-web-small-strong -mr-s inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-s rounded-pill px-s text-ink md:hidden"
        >
          <span>Menu</span>
          <span aria-hidden="true" className="relative block h-[12px] w-[18px]">
            <span
              className={`absolute left-0 h-[2px] w-full rounded-pill bg-ink transition-transform duration-200 ${
                open ? 'top-[5px] rotate-45' : 'top-0'
              }`}
            />
            <span
              className={`absolute top-[5px] left-0 h-[2px] w-full rounded-pill bg-ink transition-opacity duration-150 ${
                open ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`absolute left-0 h-[2px] w-full rounded-pill bg-ink transition-transform duration-200 ${
                open ? 'top-[5px] -rotate-45' : 'top-[10px]'
              }`}
            />
          </span>
        </button>
      </nav>
      {open && (
        <div
          ref={sheet}
          id={sheetId}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-x-0 top-full border-b border-line bg-white pt-s pb-l shadow-card animate-modal-in md:hidden ${GUTTER}`}
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={close}
                  className="type-web-body-strong flex min-h-[48px] items-center border-b border-line text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={WAITLIST_HREF}
            onClick={close}
            className={buttonClass('primary', 'mt-l w-full')}
          >
            Join the waitlist
          </Link>
        </div>
      )}
    </header>
  );
}
