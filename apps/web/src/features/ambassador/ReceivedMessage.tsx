'use client';

import { useSearchParams } from 'next/navigation';
import { receivedMessage } from './received';

/** W11 sentence from `?name=`. Uses useSearchParams, so it sits inside <Suspense>. */
export function ReceivedMessage() {
  const params = useSearchParams();
  return (
    <p className="type-web-lead max-w-[640px] text-center text-muted">
      {receivedMessage(params.get('name'))}
    </p>
  );
}
