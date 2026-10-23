import { describe, expect, it } from 'vitest';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { enforceRateLimit } from '../src/lib/rateLimit';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const reqFrom = (ip: string, spoof = '9.9.9.9') =>
  ({
    rawRequest: { headers: { 'x-forwarded-for': `${spoof}, ${ip}` } },
  }) as unknown as CallableRequest;

describe.skipIf(!hasEmulator)('enforceRateLimit', () => {
  it('allows `limit` calls then throws resource-exhausted; other IPs are unaffected', async () => {
    const action = `join-${Math.random()}`;
    for (let i = 0; i < 3; i++) await enforceRateLimit(reqFrom('1.1.1.1'), action, 3, 600);
    await expect(enforceRateLimit(reqFrom('1.1.1.1'), action, 3, 600)).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'Too many tries. Please wait a few minutes.',
    });
    await expect(enforceRateLimit(reqFrom('2.2.2.2'), action, 3, 600)).resolves.toBeUndefined();
  });

  it('ignores a spoofed leading hop', async () => {
    const action = `spoof-${Math.random()}`;
    await enforceRateLimit(reqFrom('4.4.4.4', 'a'), action, 1, 600);
    await expect(enforceRateLimit(reqFrom('4.4.4.4', 'b'), action, 1, 600)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('starts a fresh window after it expires', async () => {
    const action = `win-${Math.random()}`;
    await enforceRateLimit(reqFrom('3.3.3.3'), action, 1, 1);
    await expect(enforceRateLimit(reqFrom('3.3.3.3'), action, 1, 1)).rejects.toBeTruthy();
    await new Promise((r) => setTimeout(r, 1100));
    await expect(enforceRateLimit(reqFrom('3.3.3.3'), action, 1, 1)).resolves.toBeUndefined();
  });
});
