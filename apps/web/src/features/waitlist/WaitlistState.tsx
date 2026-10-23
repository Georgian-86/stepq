'use client';

import type { Api } from '@stepq/schemas';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type JoinResult = Api['joinWaitlist']['out'] & { username?: string };

interface WaitlistState {
  join: JoinResult | null;
  /** True once the saved result (if any) has been read from sessionStorage. */
  loaded: boolean;
  setJoin: (join: JoinResult) => void;
}

const KEY = 'stepq.waitlist';
const Ctx = createContext<WaitlistState | null>(null);

function read(): JoinResult | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JoinResult) : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's waitlist result, shared by the card (W01) and the modals (W02/W03). Kept in
 * sessionStorage so a reload with `?modal=reserve` still shows the person's own position.
 */
export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [join, setJoinState] = useState<JoinResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setJoinState((current) => current ?? read());
    setLoaded(true);
  }, []);

  const setJoin = useCallback((next: JoinResult) => {
    setJoinState(next);
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode / storage blocked: the in-memory state is enough.
    }
  }, []);

  return <Ctx.Provider value={{ join, loaded, setJoin }}>{children}</Ctx.Provider>;
}

export function useWaitlist(): WaitlistState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWaitlist needs <WaitlistProvider>');
  return ctx;
}
