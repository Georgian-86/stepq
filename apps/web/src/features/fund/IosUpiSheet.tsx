'use client';

import { upiAppSvg, type UpiApp } from '@stepq/brand';
import { upiAppLinks } from '@stepq/core';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { formatInr } from './amount';

const APPS: { key: UpiApp; name: string }[] = [
  { key: 'gpay', name: 'Google Pay' },
  { key: 'phonepe', name: 'PhonePe' },
  { key: 'paytm', name: 'Paytm' },
  { key: 'bhim', name: 'BHIM' },
  { key: 'other', name: 'Other UPI app' },
];

/**
 * M01 Pay with UPI · Phone (`10:668`) for iOS, which has no system UPI chooser: one deep link
 * per app (`upiAppLinks`), then "I've paid" for when the person comes back.
 */
export function IosUpiSheet({
  payment,
  onPaid,
  onClose,
}: {
  payment: { amount: number; upiLink: string } | null;
  onPaid: () => void;
  onClose: () => void;
}) {
  const links = payment ? upiAppLinks(payment.upiLink) : null;
  return (
    <Modal open={payment !== null} onClose={onClose} labelledBy="upi-sheet-title" variant="sheet">
      {payment && links && (
        <div className="flex flex-col gap-[6px]">
          <div aria-hidden="true" className="flex justify-center">
            <span className="h-[5px] w-[40px] rounded-pill bg-line" />
          </div>
          <h2 id="upi-sheet-title" className="type-app-heading text-ink">
            Pay {formatInr(payment.amount)} with
          </h2>
          <p className="type-app-small text-muted">
            Your phone shows the UPI apps you have installed.
          </p>
          <ul className="flex flex-col gap-[6px]">
            {APPS.map(({ key, name }) => (
              <li key={key}>
                <a
                  href={links[key]}
                  className="flex min-h-[44px] items-center gap-[12px] border-b border-line px-xs py-[12px]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex shrink-0"
                    dangerouslySetInnerHTML={{ __html: upiAppSvg[key] }}
                  />
                  <span className="type-app-body-strong min-w-0 flex-1 text-ink">{name}</span>
                  <Icon name="chev-r-muted" />
                </a>
              </li>
            ))}
          </ul>
          <Button className="mt-m w-full" onClick={onPaid}>
            I&apos;ve paid
          </Button>
        </div>
      )}
    </Modal>
  );
}
