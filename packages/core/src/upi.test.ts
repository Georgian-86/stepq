import { describe, expect, it } from 'vitest';
import { UPI_BASE, buildUpiLink, upiAppLinks } from './upi';

describe('buildUpiLink', () => {
  it('returns base with no options', () => {
    expect(buildUpiLink()).toBe(UPI_BASE);
  });
  it('appends amount and note', () => {
    expect(buildUpiLink({ amount: 501, note: 'StepQ ABCD12' })).toBe(
      UPI_BASE + '&am=501.00&cu=INR&tn=StepQ%20ABCD12',
    );
  });
});

describe('upiAppLinks', () => {
  const link = buildUpiLink({ amount: 101, note: 'StepQ X' });
  const links = upiAppLinks(link);
  it('maps per app', () => {
    expect(links.gpay.startsWith('gpay://upi/pay?pa=')).toBe(true);
    expect(links.phonepe.startsWith('phonepe://pay?pa=')).toBe(true);
    expect(links.paytm.startsWith('paytmmp://pay?pa=')).toBe(true);
    expect(links.bhim).toBe(link);
    expect(links.other).toBe(link);
  });
});
