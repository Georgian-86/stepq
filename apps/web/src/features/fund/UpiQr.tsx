'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { UPI_ID } from './upi';

type QrState = { link: string; markup: string } | { link: string; failed: true } | null;

/**
 * QR code of a UPI link, generated in code (spec §5: never an exported image). Keeps a box of
 * the same size while the SVG is generated, and shows the UPI ID instead if generation fails.
 */
export function UpiQr({
  link,
  size,
  label = 'UPI QR code',
}: {
  link: string;
  size: number;
  label?: string;
}) {
  const [qr, setQr] = useState<QrState>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(link, { type: 'svg', margin: 0, width: size, errorCorrectionLevel: 'M' })
      .then((markup) => {
        if (!cancelled) setQr({ link, markup });
      })
      .catch(() => {
        if (!cancelled) setQr({ link, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [link, size]);

  const current = qr?.link === link ? qr : null;
  const box = { width: size, height: size };

  if (current && 'failed' in current) {
    return (
      <p
        className="type-web-small flex shrink-0 items-center justify-center text-center text-muted"
        style={box}
      >
        Use UPI ID {UPI_ID}
      </p>
    );
  }
  return (
    <div
      role="img"
      aria-label={label}
      className="block shrink-0 [&>svg]:block [&>svg]:size-full"
      style={box}
      dangerouslySetInnerHTML={current ? { __html: current.markup } : undefined}
    />
  );
}
