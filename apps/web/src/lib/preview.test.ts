import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeApp = vi.fn(() => ({}));
const initializeAppCheck = vi.fn();
const getFirestore = vi.fn();
const getFunctions = vi.fn();
const httpsCallable = vi.fn();
const onSnapshot = vi.fn();

vi.mock('firebase/app', async (orig) => ({
  ...(await orig<typeof import('firebase/app')>()),
  getApps: () => [],
  initializeApp,
}));
vi.mock('firebase/app-check', () => ({ initializeAppCheck, ReCaptchaEnterpriseProvider: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  getFirestore,
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn(),
  onSnapshot,
}));
vi.mock('firebase/functions', () => ({
  getFunctions,
  connectFunctionsEmulator: vi.fn(),
  httpsCallable,
}));

describe('preview mode (NEXT_PUBLIC_PREVIEW_MODE=1)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', '1');
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_KEY', 'site-key');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('never initialises Firebase or App Check, and call() is simulated', async () => {
    const { call } = await import('./api');
    const { initAppCheck } = await import('./firebase');
    expect(initAppCheck()).toBeNull();
    // Real timers: the simulator is a lazily imported chunk, then waits ~600 ms.
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    expect(initializeApp).not.toHaveBeenCalled();
    expect(getFirestore).not.toHaveBeenCalled();
    expect(getFunctions).not.toHaveBeenCalled();
    expect(initializeAppCheck).not.toHaveBeenCalled();
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  it('public docs read as missing (count 0, no backers) without a listener', async () => {
    const { usePublicDoc } = await import('./usePublicDoc');
    const { result } = renderHook(() => usePublicDoc('stats'));
    expect(result.current).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
  });
});

describe('flag off', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initialises Firebase and calls the real callable', async () => {
    httpsCallable.mockReturnValue(async () => ({ data: { available: true } }));
    const { call } = await import('./api');
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(httpsCallable).toHaveBeenCalledWith(undefined, 'checkUsername');
  });

  it('public docs subscribe to Firestore', async () => {
    const { usePublicDoc } = await import('./usePublicDoc');
    const { result } = renderHook(() => usePublicDoc('stats'));
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
  });
});
