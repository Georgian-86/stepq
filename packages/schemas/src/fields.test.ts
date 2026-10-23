import { describe, expect, it } from 'vitest';
import { email, indianMobile, optionalPhone, personName } from './fields';

describe('indianMobile', () => {
  it.each(['+91 98765 43210', '098765-43210', '9876543210', '919876543210', '(98765) 43210'])(
    'accepts %s',
    (raw) => {
      expect(indianMobile.parse(raw)).toBe('+919876543210');
    },
  );
  it.each(['12345', '5876543210'])('rejects %s', (raw) => {
    const r = indianMobile.safeParse(raw);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Enter a 10-digit mobile number');
  });
});

describe('email', () => {
  it('trims and lower-cases', () => {
    expect(email.parse(' Riya@Gmail.com ')).toBe('riya@gmail.com');
  });
  it('rejects invalid', () => {
    expect(email.safeParse('nope').success).toBe(false);
  });
});

describe('personName', () => {
  it('trims and bounds', () => {
    expect(personName.parse('  Riya ')).toBe('Riya');
    expect(personName.safeParse('R').success).toBe(false);
    expect(personName.safeParse('x'.repeat(81)).success).toBe(false);
  });
});

describe('optionalPhone', () => {
  it('maps empty to undefined', () => {
    expect(optionalPhone.parse('')).toBeUndefined();
    expect(optionalPhone.parse(undefined)).toBeUndefined();
  });
  it('accepts 7-15 digits', () => {
    expect(optionalPhone.parse('+14155550123')).toBe('+14155550123');
    expect(optionalPhone.safeParse('123').success).toBe(false);
  });
});
