'use client';

import { normalizeUsername, usernameProblem } from '@stepq/schemas';
import { useEffect, useState } from 'react';
import { call } from '@/lib/api';

export const CHECK_DEBOUNCE_MS = 400;

export const USERNAME_MESSAGES = {
  invalid: 'Use 3–20 letters, numbers, . or _',
  reserved: 'That name is reserved.',
  taken: 'Taken',
  error: 'Could not check right now. Try again.',
} as const;

export type UsernameCheck =
  | { state: 'idle'; username: ''; message?: undefined }
  | { state: 'checking' | 'available'; username: string; message?: undefined }
  | { state: 'taken' | 'invalid' | 'error'; username: string; message: string };

type Result = Exclude<UsernameCheck, { state: 'idle' | 'checking' }>;

/**
 * Live availability of a username (spec §7): local rules first, then a `checkUsername` call
 * 400 ms after the last keystroke. Answers for an older value are ignored.
 */
export function useUsernameCheck(raw: string): UsernameCheck {
  const username = normalizeUsername(raw);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!username) return;
    let live = true;
    const timer = setTimeout(async () => {
      const problem = usernameProblem(username);
      if (problem) {
        setResult({ state: 'invalid', username, message: USERNAME_MESSAGES[problem] });
        return;
      }
      try {
        const res = await call('checkUsername', { username });
        if (!live) return;
        if (res.available) setResult({ state: 'available', username });
        else if (res.reason === 'taken')
          setResult({ state: 'taken', username, message: USERNAME_MESSAGES.taken });
        else
          setResult({
            state: 'invalid',
            username,
            message: USERNAME_MESSAGES[res.reason === 'reserved' ? 'reserved' : 'invalid'],
          });
      } catch {
        if (live) setResult({ state: 'error', username, message: USERNAME_MESSAGES.error });
      }
    }, CHECK_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [username]);

  if (!username) return { state: 'idle', username: '' };
  if (result?.username === username) return result;
  return { state: 'checking', username };
}
