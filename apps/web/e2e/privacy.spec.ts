import { expect, test } from '@playwright/test';

test('footer Privacy policy opens /privacy with the coming-soon notice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Policy coming soon');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
