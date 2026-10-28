import { UPI_BASE } from '@stepq/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFieldError } from './apiErrors';
import { PREVIEW_ACTION_ERROR, PREVIEW_DELAY_MS, previewCall } from './previewApi';

const requestId = '3b241101-e2bb-4255-8caf-4136c566a962';
const join = (email: string) => ({
  name: 'Riya Sharma',
  email,
  gender: 'female' as const,
  ageGroup: '18_24' as const,
  country: 'India' as const,
  requestId,
  website: '' as const,
});

/** Runs a preview call to completion, with fake timers standing in for the ~600 ms wait. */
async function settle<T>(p: Promise<T>): Promise<T> {
  const done = p.then(
    (v) => ({ ok: true as const, v }),
    (e: unknown) => ({ ok: false as const, e }),
  );
  await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS);
  const r = await done;
  if (r.ok) return r.v;
  throw r.e;
}

describe('previewCall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('answers only after the simulated network delay', async () => {
    let done = false;
    const p = previewCall('checkUsername', { username: 'riya.walks' }).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(PREVIEW_DELAY_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });

  it('joinWaitlist counts up per session and recognises a repeat email (normalised)', async () => {
    await expect(settle(previewCall('joinWaitlist', join('riya@example.com')))).resolves.toEqual({
      status: 'joined',
      position: 1,
      reserveToken: 'preview',
      email: 'riya@example.com',
    });
    await expect(settle(previewCall('joinWaitlist', join('aman@example.com')))).resolves.toEqual(
      expect.objectContaining({ status: 'joined', position: 2, email: 'aman@example.com' }),
    );
    await expect(settle(previewCall('joinWaitlist', join(' Riya@Example.com ')))).resolves.toEqual({
      status: 'existing',
      position: 1,
      email: 'riya@example.com',
    });
  });

  it('validates with the shared zod schema and reports field errors', async () => {
    const err = await settle(
      previewCall('joinWaitlist', { ...join('not-an-email'), name: '' }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiFieldError);
    expect(Object.keys((err as ApiFieldError).fields).sort()).toEqual(['email', 'name']);
  });

  it('checkUsername applies the local rules and this session’s reservations', async () => {
    await expect(settle(previewCall('checkUsername', { username: 'ab' }))).resolves.toEqual({
      available: false,
      reason: 'invalid',
    });
    await expect(settle(previewCall('checkUsername', { username: 'StepQ' }))).resolves.toEqual({
      available: false,
      reason: 'reserved',
    });
    await expect(
      settle(previewCall('checkUsername', { username: '@Riya.Walks' })),
    ).resolves.toEqual({ available: true });

    await expect(
      settle(previewCall('reserveUsername', { username: 'Riya.Walks', reserveToken: 'preview' })),
    ).resolves.toEqual({ username: 'riya.walks' });
    await expect(settle(previewCall('checkUsername', { username: 'riya.walks' }))).resolves.toEqual(
      { available: false, reason: 'taken' },
    );
    await expect(
      settle(previewCall('reserveUsername', { username: 'riya.walks', reserveToken: 'preview' })),
    ).rejects.toThrow('Taken. Try another.');
  });

  it('reserveUsername rejects invalid and reserved names as field errors', async () => {
    const err = await settle(
      previewCall('reserveUsername', { username: 'admin', reserveToken: 'preview' }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiFieldError);
    expect((err as ApiFieldError).fields).toEqual({ username: 'That name is reserved.' });
  });

  it('form callables answer with the first name', async () => {
    const res = await settle(
      previewCall('sendFounderMessage', {
        name: 'riya sharma',
        email: 'riya@example.com',
        phone: '',
        topic: 'investment',
        message: 'Hello there, can we talk?',
        requestId,
        website: '',
      }),
    );
    expect(res).toEqual({ firstName: 'Riya' });
  });

  it('recordBacking returns a reference and a real UPI link for the amount', async () => {
    const res = await settle(
      previewCall('recordBacking', {
        name: 'Riya Sharma',
        phone: '9876543210',
        amount: 500,
        showOnWall: true,
        requestId,
        website: '',
      }),
    );
    expect(res.amount).toBe(500);
    expect(res.reference).toMatch(/^[A-Z2-9]{6}$/);
    expect(res.upiLink.startsWith(UPI_BASE)).toBe(true);
    expect(res.upiLink).toContain('am=500');
    expect(res.upiLink).toContain(encodeURIComponent(`StepQ ${res.reference}`));
  });

  it('describeAction and confirmAction explain that the backend is not connected', async () => {
    await expect(settle(previewCall('describeAction', { token: 'x' }))).rejects.toThrow(
      PREVIEW_ACTION_ERROR,
    );
    await expect(settle(previewCall('confirmAction', { token: 'x' }))).rejects.toThrow(
      PREVIEW_ACTION_ERROR,
    );
    expect(PREVIEW_ACTION_ERROR).toBe(
      'Approve and verify links work once the backend is connected.',
    );
  });

  it('still works when sessionStorage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const res = await settle(previewCall('joinWaitlist', join('solo@example.com')));
    expect(res.status).toBe('joined');
  });
});
