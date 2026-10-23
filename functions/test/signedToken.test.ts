import { describe, expect, it } from 'vitest';
import { signToken, verifyAnyToken, verifyToken } from '../src/lib/signedToken';

const future = () => Date.now() + 60_000;

describe('signedToken', () => {
  it('round-trips', () => {
    const t = signToken({ k: 'reserve', id: 'abc', exp: future() });
    expect(verifyToken(t, 'reserve')).toEqual({ id: 'abc' });
  });

  it('rejects a tampered payload', () => {
    const [, sig] = signToken({ k: 'reserve', id: 'abc', exp: future() }).split('.');
    const forged = Buffer.from(
      JSON.stringify({ k: 'reserve', id: 'evil', exp: future() }),
    ).toString('base64url');
    expect(() => verifyToken(`${forged}.${sig}`, 'reserve')).toThrowError(
      expect.objectContaining({ code: 'permission-denied' }),
    );
  });

  it('rejects an expired token', () => {
    const t = signToken({ k: 'reserve', id: 'abc', exp: Date.now() - 1 });
    expect(() => verifyToken(t, 'reserve')).toThrowError(
      expect.objectContaining({ code: 'permission-denied' }),
    );
  });

  it('rejects a kind mismatch', () => {
    const t = signToken({ k: 'reserve', id: 'abc', exp: future() });
    expect(() => verifyToken(t, 'verifyBacking')).toThrowError(
      expect.objectContaining({ code: 'permission-denied' }),
    );
  });

  it('rejects garbage', () => {
    for (const bad of ['', 'x', 'a.b.c', '.']) {
      expect(() => verifyToken(bad, 'reserve')).toThrowError(
        expect.objectContaining({ code: 'permission-denied' }),
      );
    }
  });

  it('verifyAnyToken returns the verified kind only when allowed', () => {
    const t = signToken({ k: 'approveAmbassador', id: 'a1', exp: future() });
    expect(verifyAnyToken(t, ['approveAmbassador', 'verifyBacking'])).toEqual({
      k: 'approveAmbassador',
      id: 'a1',
    });
    expect(() => verifyAnyToken(t, ['verifyBacking'])).toThrowError(
      expect.objectContaining({ code: 'permission-denied' }),
    );
    expect(() => verifyAnyToken('junk', ['verifyBacking'])).toThrowError(
      expect.objectContaining({ code: 'permission-denied' }),
    );
  });
});
