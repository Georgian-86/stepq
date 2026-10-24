import { UPI_BASE } from '@stepq/core';
import { UpiIdPill } from './UpiIdPill';
import { UpiQr } from './UpiQr';

/**
 * W06 "Or scan to pay right now" (`30:1062`): the base UPI QR (no amount) and the UPI ID.
 * The QR frame keeps Figma's scaled-instance values (radius 13.6, padding 10.88, 1 px border:
 * 159.8 px wide) so the text column is Figma's 390 px and wraps like the frame.
 */
export function ScanToPayCard() {
  return (
    <section
      aria-labelledby="scan-title"
      className="flex w-full flex-col items-start gap-[20px] rounded-(--radius-card) border border-line bg-white py-[20px] pr-l pl-[20px] sm:flex-row sm:items-center"
    >
      <div className="shrink-0 rounded-[13.6px] border border-line bg-white p-[10.88px]">
        <UpiQr link={UPI_BASE} size={136} label="UPI QR code for StepQ" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-s">
        <h2 id="scan-title" className="type-web-body-strong text-ink">
          Or scan to pay right now
        </h2>
        <p className="type-web-small text-muted">
          Open any UPI app on your phone and scan this code. Add your details{' '}
          {/* The form sits beside the card from lg up, above it on smaller screens. */}
          <span className="lg:hidden">above</span>
          <span className="max-lg:hidden">on the right</span> so StepQ can match your payment to
          your name.
        </p>
        <UpiIdPill />
      </div>
    </section>
  );
}
