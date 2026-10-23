'use client';

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
 * A modal addressed by `?modal=<name>` (plus optional extra params), so it can be linked and
 * the back button closes it. Uses the History API, which Next.js App Router stays in sync with.
 */
export function useModalParam(name: string) {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const isOpen = params.get('modal') === name;

  const open = useCallback(
    (extra?: Record<string, string>) => {
      const url = new URL(window.location.href);
      url.searchParams.set('modal', name);
      for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
      window.history.pushState({ ...window.history.state, [MARK]: name }, '', url);
      window.dispatchEvent(new Event(CHANGE));
    },
    [name],
  );

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
      const { [MARK]: _drop, ...rest } = state ?? {};
      void _drop;
      window.history.replaceState(rest, '', url);
      window.dispatchEvent(new Event(CHANGE));
    },
    [name],
  );

  return { isOpen, open, close, params };
}
