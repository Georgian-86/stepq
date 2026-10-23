'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * QR code of a UPI link, generated in code (spec §5: never an exported image). Renders an
 * empty box of the same size until the SVG is ready, so nothing shifts.
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
  const [svg, setSvg] = useState<{ link: string; markup: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(link, { type: 'svg', margin: 0, width: size, errorCorrectionLevel: 'M' })
      .then((markup) => {
        if (!cancelled) setSvg({ link, markup });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [link, size]);

  return (
    <div
      role="img"
      aria-label={label}
      data-link={link}
      className="block shrink-0 [&>svg]:block [&>svg]:size-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={svg?.link === link ? { __html: svg.markup } : undefined}
    />
  );
}
