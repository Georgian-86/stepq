'use client';

import { useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { SENT_KEY, sentMessage } from './sent';

const noop = () => () => {};
function storedEmail(): string | null {
  try {
    return window.sessionStorage.getItem(SENT_KEY);
  } catch {
    return null;
  }
}

/** W05 sentence from `?name=&role=` and the email kept in sessionStorage by the form. */
export function ApplicationSentMessage() {
  const params = useSearchParams();
  const email = useSyncExternalStore(noop, storedEmail, () => null);
  return (
    <p className="type-web-lead max-w-[640px] text-center text-muted">
      {sentMessage({ name: params.get('name'), role: params.get('role'), email })}
    </p>
  );
}
