export const UPI_BASE = 'upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ';

export function buildUpiLink(opts: { amount?: number; note?: string } = {}): string {
  let link = UPI_BASE;
  if (opts.amount !== undefined) link += `&am=${opts.amount.toFixed(2)}&cu=INR`;
  if (opts.note !== undefined) link += `&tn=${encodeURIComponent(opts.note)}`;
  return link;
}

export function upiAppLinks(link: string): {
  gpay: string;
  phonepe: string;
  paytm: string;
  bhim: string;
  other: string;
} {
  const swap = (prefix: string) => link.replace('upi://pay?', prefix);
  return {
    gpay: swap('gpay://upi/pay?'),
    phonepe: swap('phonepe://pay?'),
    paytm: swap('paytmmp://pay?'),
    bhim: link,
    other: link,
  };
}
