import Link from 'next/link';

/**
 * The notice shown on every form before it is sent (DPDP Act s.5): what the details are for,
 * where to read more, and how to withdraw. Sending the form after reading it is the consent.
 */
export function FormPrivacyNote({ purpose }: { purpose: string }) {
  return (
    <p className="type-web-small text-muted">
      We use these details only to {purpose}. They are stored in India and never sold. Read our{' '}
      <Link href="/privacy" className="text-deep underline">
        Privacy policy
      </Link>{' '}
      to see how long we keep them, or email us any time to see or delete them.
    </p>
  );
}
