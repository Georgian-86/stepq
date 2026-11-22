'use client';

import { useEffect, useState } from 'react';
import { countingAllowed, setCountingOptOut } from './Tracker';

/**
 * Footer control for the site's anonymous visit counting (see Tracker). It sets no cookie; the
 * choice is kept in this browser's local storage.
 */
export function CountingChoice() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(countingAllowed()), []);
  if (on === null) return null;
  return (
    <p>
      No tracking cookies. Anonymous visit counting is {on ? 'on' : 'off'}.{' '}
      <button
        type="button"
        className="text-deep underline"
        onClick={() => {
          setCountingOptOut(on);
          setOn(!on);
        }}
      >
        {on ? 'Turn it off' : 'Turn it on'}
      </button>
    </p>
  );
}
