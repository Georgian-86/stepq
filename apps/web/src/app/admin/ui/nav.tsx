'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { tableLabel } from '@/lib/adminTables';
import { PanelSkeleton, StatsSkeleton, TableSkeleton } from './Skeletons';

/**
 * Dashboard navigation that answers at once. Links and filter forms record where they are
 * going; until the address bar gets there, the sidebar already shows the destination, a
 * progress bar runs, and the content area shows a skeleton of the next view (another table,
 * Stats, a record's details) or, for a change to the same table (page, sort, filter), keeps the
 * rows on screen, dimmed, until the new ones arrive. Next's own router does the navigating.
 * Links prefetch their view when hovered, focused or touched, so a click often has nothing left
 * to wait for.
 */

type Nav = {
  /** Where the pending navigation goes (null when none). */
  target: URL | null;
  /** Records a navigation that is starting (no-op for the current address). */
  expect: (href: string) => void;
  prefetch: (href: string) => void;
};

const NavContext = createContext<Nav | null>(null);

function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('Dashboard navigation outside NavProvider');
  return nav;
}

/** How long a hover waits before prefetching, so sweeping the pointer across a list is free. */
const HOVER_INTENT_MS = 70;
/** A prefetched view is used for this long (Next's router cache keeps it 30 s). */
const PREFETCH_FRESH_MS = 25_000;
/** A navigation that has not arrived by then (an error page, say) stops showing as pending. */
const GIVE_UP_MS = 20_000;
/** How often a pending navigation is nudged (see NavProvider). */
const NUDGE_MS = 250;
/** Coming back to the tab after this long refreshes the numbers in the background. */
const REFRESH_AFTER_HIDDEN_MS = 60_000;

const addressOf = (url: URL) => url.pathname + url.search;

export function NavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const [target, setTarget] = useState<URL | null>(null);
  const prefetched = useRef(new Map<string, number>());

  // The address changes when the next view is on screen: that ends the wait.
  useEffect(() => setTarget(null), [here]);
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => setTarget(null), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [target]);

  // React 19.2 can drop the wake-up for a same-page navigation (new search params) whose data
  // has fully arrived, so the click never lands until some other state changes
  // (react/react#37830; seen on production builds only). While a navigation is pending, a tiny
  // state update every 250 ms lets a stuck one commit at once; it costs nothing otherwise.
  const [, nudge] = useState(0);
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => nudge((n) => n + 1), NUDGE_MS);
    return () => clearInterval(t);
  }, [target]);

  const prefetch = useCallback(
    (href: string) => {
      const at = prefetched.current.get(href);
      if (at && Date.now() - at < PREFETCH_FRESH_MS) return;
      prefetched.current.set(href, Date.now());
      router.prefetch(href, { kind: PrefetchKind.FULL });
    },
    [router],
  );

  const expect = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      // A prefetch started after the navigation would replace its request in Next's cache.
      prefetched.current.set(href, Date.now());
      setTarget(addressOf(url) === here ? null : url);
    },
    [here],
  );

  // Back in the tab after a while: re-read everything in the background, without a skeleton.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > REFRESH_AFTER_HIDDEN_MS) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [router]);

  const value = useMemo(() => ({ target, expect, prefetch }), [target, expect, prefetch]);
  return (
    <NavContext.Provider value={value}>
      <ProgressBar on={target !== null} />
      {children}
    </NavContext.Provider>
  );
}

/** A thin bar at the top while a view loads; it appears only if the wait is noticeable. */
function ProgressBar({ on }: { on: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden transition-opacity duration-200 ${
        on ? 'opacity-100 delay-100' : 'opacity-0'
      }`}
    >
      {on && <div className="h-full w-full origin-left animate-admin-progress bg-leaf" />}
    </div>
  );
}

const plainClick = (e: MouseEvent<HTMLAnchorElement>) =>
  e.button === 0 &&
  !e.metaKey &&
  !e.ctrlKey &&
  !e.shiftKey &&
  !e.altKey &&
  e.currentTarget.target !== '_blank';

/**
 * A dashboard link: prefetches on hover, focus or touch (never just for being on screen, which
 * for a 50-row table would be dozens of background requests), and shows its navigation as
 * pending until it lands.
 */
export function NavLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href' | 'prefetch'> & { href: string }) {
  const { expect, prefetch } = useNav();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => prefetch(href), HOVER_INTENT_MS);
      }}
      onMouseLeave={() => clearTimeout(timer.current)}
      onFocus={() => prefetch(href)}
      onTouchStart={() => prefetch(href)}
      onClick={(e) => {
        clearTimeout(timer.current);
        onClick?.(e);
        if (!e.defaultPrevented && plainClick(e)) expect(href);
      }}
    />
  );
}

/**
 * A GET form whose submit is a dashboard navigation. With `auto`, choosing an option or a date
 * applies it straight away.
 */
export function NavForm({
  action,
  auto = false,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'action' | 'method' | 'onSubmit'> & {
  action: string;
  auto?: boolean;
}) {
  const { expect } = useNav();
  const router = useRouter();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.currentTarget.closest('details')?.removeAttribute('open');
    const query = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget)) {
      // An empty filter (`f.<column>=`) means "not set"; other empty fields mean nothing.
      if (typeof v === 'string' && (v || k.startsWith('f.'))) query.append(k, v);
    }
    const qs = query.toString();
    const href = qs ? `${action}?${qs}` : action;
    expect(href);
    router.push(href, { scroll: false });
  };
  return (
    <form
      {...props}
      action={action}
      method="get"
      onSubmit={submit}
      onChange={
        auto
          ? (e) => {
              const el = e.target as HTMLElement;
              if (
                el instanceof HTMLSelectElement ||
                (el instanceof HTMLInputElement && el.type === 'date')
              ) {
                e.currentTarget.requestSubmit();
              }
            }
          : undefined
      }
    >
      {children}
    </form>
  );
}

/** The view a URL shows: Stats, or a table (with a record's details open or not). */
const viewOf = (q: URLSearchParams) => ({
  table: q.get('t') ?? '',
  row: q.get('row') ?? '',
  edit: q.get('edit') ?? '',
});

/** The table (or '' for Stats) the sidebar should mark: where you are going, else where you are. */
export function useActiveTable(): string {
  const { target } = useNav();
  const params = useSearchParams();
  const pathname = usePathname();
  if (target && target.pathname === '/admin') return viewOf(target.searchParams).table;
  return pathname === '/admin' ? (params.get('t') ?? '') : '';
}

/**
 * The content area. While a navigation is pending it shows the next view's skeleton when the
 * view changes, a details panel skeleton over the table when a record is opened, and otherwise
 * the current view, dimmed and marked busy.
 */
export function NavContent({ children }: { children: ReactNode }) {
  const { target } = useNav();
  const params = useSearchParams();
  const here = viewOf(params);
  const next = target && target.pathname === '/admin' ? viewOf(target.searchParams) : null;
  const switching = next !== null && next.table !== here.table;
  const opening = next !== null && !switching && next.row !== '' && next.row !== here.row;
  return (
    <main
      aria-busy={target ? true : undefined}
      className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7"
    >
      {switching ? (
        next.table ? (
          <TableSkeleton title={tableLabel(next.table)} />
        ) : (
          <StatsSkeleton />
        )
      ) : (
        <div
          className={`transition-opacity duration-150 ${
            target && !opening ? 'pointer-events-none opacity-60 delay-150' : ''
          }`}
        >
          {children}
        </div>
      )}
      {opening && <PanelSkeleton />}
    </main>
  );
}

/** Hides the details panel as soon as its close link is followed. */
export function PanelGate({ children }: { children: ReactNode }) {
  const { target } = useNav();
  const closing =
    target !== null && target.pathname === '/admin' && !target.searchParams.get('row');
  return closing ? null : children;
}
