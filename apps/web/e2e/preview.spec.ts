import { expect, test, type Page } from '@playwright/test';

/**
 * Preview build smoke test (no Firebase, no emulators): `pnpm e2e:preview`. Skipped unless
 * PREVIEW_E2E=1, which playwright.preview.config.ts sets.
 */
test.skip(process.env.PREVIEW_E2E !== '1', 'needs a preview build: pnpm e2e:preview');

const banner = (page: Page) => page.getByRole('note');
const w02 = (page: Page) => page.getByRole('dialog', { name: "You're on the list!" });

test('every page is noindex and shows the preview banner above the nav', async ({ page }) => {
  for (const path of ['/', '/join-the-team', '/fund', '/ambassadors', '/privacy']) {
    const res = await page.goto(path);
    expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(banner(page)).toContainText("Preview — forms don't save anything yet.");
    const bannerBox = await banner(page).boundingBox();
    const navBox = await page.locator('header').first().boundingBox();
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  }
  await page.goto('/fund');
  await expect(banner(page)).toContainText('UPI payments made here are real.');
});

test('join → W02 → reserve a username → W03, with a zero live count', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'joined the waitlist' })).toHaveText(
    '0 people have joined the waitlist',
  );
  await expect(page.getByRole('heading', { name: 'Our early backers' })).toHaveCount(0);

  const form = page.locator('#waitlist');
  await form.getByLabel('Full name').fill('Riya Sharma');
  await form.getByLabel('Email').fill(' Riya@Example.com ');
  await form.getByRole('radio', { name: 'Female' }).click();
  await form.getByRole('radio', { name: '18–24' }).click();
  await form.getByRole('button', { name: 'Join the waitlist' }).click();

  const reserve = w02(page);
  await expect(reserve).toContainText("You're #1. Preview: nothing was saved or emailed.");
  await reserve.getByLabel('Username').fill('riya.walks');
  await expect(reserve.getByText('Available', { exact: true })).toBeVisible();
  await reserve.getByRole('button', { name: 'Reserve @riya.walks' }).click();

  const reserved = page.getByRole('dialog', { name: '@riya.walks is yours' });
  await expect(reserved).toContainText('Preview: nothing was saved or emailed.');
  await reserved.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an invalid email still shows the field error', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('#waitlist');
  await form.getByLabel('Full name').fill('Riya Sharma');
  await form.getByLabel('Email').fill('riya@');
  await form.getByRole('radio', { name: 'Female' }).click();
  await form.getByRole('radio', { name: '18–24' }).click();
  await form.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(form.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await expect(w02(page)).toHaveCount(0);
});

test('founder message → W17', async ({ page }) => {
  await page.goto('/?modal=founder');
  const modal = page.getByRole('dialog', { name: 'Connect with the founder' });
  await modal.getByLabel('Your name').fill('Riya Sharma');
  await modal.getByLabel('Email').fill('riya@example.com');
  await modal.getByRole('radio', { name: 'Investment' }).click();
  await modal.getByLabel('Message').fill('We run a 2,000-student college in Pune. Can we talk?');
  await modal.getByRole('button', { name: 'Send to the founder' }).click();

  const sent = page.getByRole('dialog', { name: 'Message sent' });
  await expect(sent).toContainText('Thanks, Riya. Preview: nothing was saved or emailed.');
});

test('the UPI hand-off warns that payments are real and not recorded', async ({ page }) => {
  await page.goto('/fund');
  await page.getByLabel('Name', { exact: true }).fill('Riya Sharma');
  await page.getByLabel('Contact number').fill('98765 43210');
  // Desktop: W07 QR modal. Mobile (Android UA): the inline "Open UPI app" state.
  await page.getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
  await expect(
    page.getByText("Preview: UPI payments made here are real and won't be recorded."),
  ).toBeVisible();
});
