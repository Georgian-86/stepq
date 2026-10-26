import { expect, test } from '@playwright/test';

// The e2e build has no Supabase Auth, so this checks the locked-down, signed-out side.
test('/admin sends signed-out visitors to the login page, which is not indexed', async ({
  page,
}) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'StepQ admin' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('admin data routes answer 404 without an admin session', async ({ request }) => {
  expect((await request.get('/admin/export?t=waitlist')).status()).toBe(404);
  expect((await request.get('/admin/resume/00000000-0000-0000-0000-000000000000')).status()).toBe(
    404,
  );
  const res = await request.get('/admin/login');
  expect(res.headers()['x-robots-tag']).toContain('noindex');
});
