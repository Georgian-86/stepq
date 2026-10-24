import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  actionTokenFromMail,
  callFunction,
  readDoc,
  readMail,
  resetEmulators,
} from './helpers/emulator';

test.beforeEach(async () => {
  await resetEmulators();
});

test('a bad or missing token shows a friendly error and no Confirm button', async ({ page }) => {
  await page.goto('/confirm?token=not-a-real.token');
  await expect(page.getByText('This link is not valid.')).toBeVisible();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);

  await page.goto('/confirm');
  await expect(page.getByText('This link is not valid.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);
});

test('verifying a backing happens only on Confirm', async ({ page }) => {
  const { reference } = await callFunction<{ reference: string }>('recordBacking', {
    name: 'Riya Sharma',
    phone: '9876543210',
    amount: 251,
    showOnWall: true,
    website: '',
    requestId: randomUUID(),
  });
  await expect.poll(async () => (await readMail({ template: 'backingAlert' })).length).toBe(1);
  const [alert] = await readMail({ template: 'backingAlert' });
  const token = actionTokenFromMail(alert!);

  await page.goto(`/confirm?token=${encodeURIComponent(token)}`);
  await expect(page.getByText(`Verify ₹251 from Riya S. (ref ${reference})?`)).toBeVisible();
  expect((await readDoc<{ names?: string[] }>('public/backers'))?.names ?? []).toEqual([]);

  await page.getByRole('button', { name: 'Confirm' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
  expect((await readDoc<{ names: string[] }>('public/backers'))?.names).toEqual(['Riya S.']);
});
