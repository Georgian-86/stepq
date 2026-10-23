import { describe, expect, it } from 'vitest';
import { waitlistSource } from './source';

describe('waitlistSource', () => {
  it('keeps ref and utm_* params, drops everything else', () => {
    expect(waitlistSource('?ref=abc&utm_source=ig&utm_campaign=launch&modal=reserve&x=1')).toBe(
      'ref=abc&utm_source=ig&utm_campaign=launch',
    );
  });

  it('is undefined when there is nothing to keep', () => {
    expect(waitlistSource('')).toBeUndefined();
    expect(waitlistSource('?modal=founder')).toBeUndefined();
    expect(waitlistSource('?ref=')).toBeUndefined();
  });

  it('fits the 200-character schema limit', () => {
    const s = waitlistSource(`?ref=${'a'.repeat(150)}&utm_source=${'b'.repeat(150)}`)!;
    expect(s.length).toBeLessThanOrEqual(200);
    expect(s.startsWith(`ref=${'a'.repeat(150)}`)).toBe(true);
  });
});
