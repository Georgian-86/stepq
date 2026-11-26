import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';
import { parseLimit, proError } from './pro';

describe('parseLimit', () => {
  it('reads blank and "unlimited" as no limit', () => {
    expect(parseLimit('')).toBeNull();
    expect(parseLimit(null)).toBeNull();
    expect(parseLimit(' Unlimited ')).toBeNull();
  });
  it('reads whole numbers', () => {
    expect(parseLimit('3')).toBe(3);
    expect(parseLimit('0')).toBe(0);
  });
  it('refuses anything else', () => {
    for (const bad of ['-1', '2.5', 'three', '1e3', '9999999']) {
      expect(() => parseLimit(bad)).toThrow(ApiError);
    }
  });
});

describe('proError', () => {
  it('turns Postgres refusals into messages an admin can act on', () => {
    expect(() => proError({ code: '42501', message: 'Admins only.' })).toThrow(
      'Only admins can do that.',
    );
    expect(() => proError({ code: '22023', message: 'Pick a time in the future.' })).toThrow(
      'Pick a time in the future.',
    );
  });
  it('rethrows anything unexpected', () => {
    const e = new Error('connection lost');
    expect(() => proError(e)).toThrow(e);
  });
});
