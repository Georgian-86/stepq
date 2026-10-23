import { describe, expect, it } from 'vitest';
import { firstName, newReference, wallName } from './reference';

describe('newReference', () => {
  it('is 6 unambiguous chars', () => {
    for (let i = 0; i < 1000; i++) expect(newReference()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe('names', () => {
  it('wallName', () => {
    expect(wallName('riya  sharma')).toBe('Riya S.');
    expect(wallName('Riya')).toBe('Riya');
  });
  it('firstName', () => {
    expect(firstName('  riya sharma')).toBe('Riya');
  });
});
