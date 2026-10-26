import { expect, test } from '@playwright/test';

test('footer Privacy policy opens /privacy with StepQ’s policy, indexable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'On this page' })).toContainText('Your rights');
  await expect(page.getByRole('heading', { name: 'Where it is stored' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
