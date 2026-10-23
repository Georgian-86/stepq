'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

const CHANGE = 'stepq:locationchange';
const MARK = '__stepqModal';

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(CHANGE, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(CHANGE, cb);
  };
}
const getSearch = () => window.location.search;
const getServerSearch = () => '';

/**
 * Opens `?modal=<name>` (plus extra params) as a new history entry, so Back closes it.
 * Only our marker goes into history state; Next's patched pushState adds its own router
 * state and keeps useSearchParams in sync.
 */
export function openModalParam(name: string, extra: Record<string, string> = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set('modal', name);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  window.history.pushState({ [MARK]: name }, '', url);
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * Swaps the open modal for `name` in place (no new history entry), e.g. W02 → W03, dropping
 * `removeKeys` (such as a one-time token). If the current entry was pushed by a modal, the new
 * one is marked too, so closing it goes Back to the page underneath.
 */
export function replaceModalParam(
  name: string,
  extra: Record<string, string> = {},
  removeKeys: string[] = [],
) {
  const url = new URL(window.location.href);
  for (const k of removeKeys) url.searchParams.delete(k);
  url.searchParams.set('modal', name);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const state = window.history.state as Record<string, unknown> | null;
  window.history.replaceState(state?.[MARK] ? { [MARK]: name } : {}, '', url);
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * A modal addressed by `?modal=<name>`, so it can be linked and the back button closes it.
 * Reacts to `open()`, Back/Forward and Next navigations (`<Link href="?modal=…">`,
 * `router.push`) via `useSearchParams`. Because of that, a component using this hook must
 * sit inside a `<Suspense>` boundary on statically rendered pages.
 */
export function useModalParam(name: string) {
  // Subscribes this component to App Router navigations (they fire no popstate).
  const nextParams = useSearchParams();
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  // Read the live URL (closed on the server, like the hydration snapshot); nextParams is a
  // dependency only so a router navigation recomputes.
  const params = useMemo(() => new URLSearchParams(search), [search, nextParams]);
  const isOpen = params.get('modal') === name;

  const open = useCallback((extra?: Record<string, string>) => openModalParam(name, extra), [name]);

  const close = useCallback(
    (extraKeys: string[] = []) => {
      const state = window.history.state as Record<string, unknown> | null;
      if (state?.[MARK] === name) {
        window.history.back();
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('modal');
      for (const k of extraKeys) url.searchParams.delete(k);
      window.history.replaceState({}, '', url);
      window.dispatchEvent(new Event(CHANGE));
    },
    [name],
  );

  return { isOpen, open, close, params };
}
