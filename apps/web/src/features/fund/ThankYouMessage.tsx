'use client';

import { useSearchParams } from 'next/navigation';
import { thankYouMessage } from './amount';

/** W08 sentence with the amount from `?amount=` (left out when missing or invalid). */
export function ThankYouMessage() {
  const params = useSearchParams();
  return (
    <p className="type-web-lead max-w-[640px] text-center text-muted">
      {thankYouMessage(params.get('amount'))}
    </p>
  );
}
