'use client';

import { PreviewNote } from '@/components/site/PreviewNote';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PREVIEW_UPI_NOTE } from '@/lib/preview';
import { formatInr } from './amount';
import { UpiIdPill } from './UpiIdPill';
import { UpiQr } from './UpiQr';

/** W07 Pay with UPI (`10:663`): QR of the recorded backing's link (amount + reference note). */
export function PayModal({
  payment,
  onPaid,
  onClose,
}: {
  payment: { amount: number; upiLink: string } | null;
  onPaid: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={payment !== null} onClose={onClose} labelledBy="pay-title">
      {payment && (
        <div className="flex flex-col items-center gap-[18px] text-center">
          <h2 id="pay-title" className="type-web-h2 text-ink">
            Scan to pay {formatInr(payment.amount)}
          </h2>
          <p className="type-web-body text-muted">
            Open any UPI app on your phone and scan this code.
          </p>
          <div className="rounded-(--radius-card) border-[1.5px] border-line bg-white p-m">
            <UpiQr
              link={payment.upiLink}
              size={200}
              label={`UPI QR code for ${formatInr(payment.amount)}`}
            />
          </div>
          <UpiIdPill className="justify-center" />
          <PreviewNote>{PREVIEW_UPI_NOTE}</PreviewNote>
          <Button data-autofocus className="w-full" onClick={onPaid}>
            I&apos;ve paid
          </Button>
          <Button variant="text" className="min-h-[44px] px-xs py-[10px]" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </Modal>
  );
}
