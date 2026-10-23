import { describe, expect, it } from 'vitest';
import {
  UPI_BASE,
  buildUpiLink,
  firstName,
  newReference,
  upiAppLinks,
  wallName,
} from '@stepq/core';

describe('package entry', () => {
  it('resolves @stepq/core via exports', () => {
    expect(buildUpiLink()).toBe(UPI_BASE);
    expect(typeof upiAppLinks).toBe('function');
    expect(newReference()).toHaveLength(6);
    expect(firstName('riya sharma')).toBe('Riya');
    expect(wallName('riya sharma')).toBe('Riya S.');
  });
});
