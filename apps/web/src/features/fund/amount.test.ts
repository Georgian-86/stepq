import { describe, expect, it } from 'vitest';
import { formatInr, parseAmount, payLabel, thankYouHref, thankYouMessage } from './amount';

describe('parseAmount', () => {
  it.each([
    ['501', 501],
    [' 1,001 ', 1001],
    ['0', 0],
    ['10.5', 10.5],
    ['', undefined],
    ['abc', undefined],
  ])('%j → %j', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });
});

describe('formatInr', () => {
  it('uses Indian grouping', () => {
    expect(formatInr(1001)).toBe('₹1,001');
    expect(formatInr(100000)).toBe('₹1,00,000');
    expect(formatInr(251)).toBe('₹251');
  });
});

describe('payLabel', () => {
  it('names a valid amount and falls back otherwise', () => {
    expect(payLabel(501)).toBe('Pay ₹501 with UPI');
    expect(payLabel(1001)).toBe('Pay ₹1,001 with UPI');
    for (const bad of [undefined, 0, 10.5, 100001]) expect(payLabel(bad)).toBe('Pay with UPI');
  });
});

describe('thank-you page', () => {
  it('builds the W08 href', () => {
    expect(thankYouHref(251)).toBe('/fund/thank-you?amount=251');
  });

  it('includes a valid amount only', () => {
    const tail =
      ' Once StepQ verifies it, you will get a personal email and your name will join the sponsor wall.';
    expect(thankYouMessage('501')).toBe(`We have recorded your payment of ₹501.${tail}`);
    expect(thankYouMessage('100000')).toBe(`We have recorded your payment of ₹1,00,000.${tail}`);
    for (const bad of [null, '', 'abc', '0', '1.5', '100001', '12abc', '-5'])
      expect(thankYouMessage(bad)).toBe(`We have recorded your payment.${tail}`);
  });
});
