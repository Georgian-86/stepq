import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { resetEmulators, writeDoc } from './helpers/emulator';

/**
 * Figma visual parity (spec §4). Each W1 frame's state is rendered at 1440 wide with reduced
 * motion and compared with the Figma export (`e2e/figma/*.png`, copied as the baselines in
 * `visual.spec.ts-snapshots/`). The Figma sample values (12,480 people, #12,481, the backer
 * names) exist only in the emulator inside these tests. Modal frames are drawn in Figma over a
 * blank page, so the page behind the dialog is hidden here.
 * The 390 px pass saves screenshots to `e2e/artifacts/` for review; it asserts nothing.
 */

const PARITY = { fullPage: true, maxDiffPixelRatio: 0.02 } as const;
/** Modal frames are one viewport tall. */
const MODAL_PARITY = { maxDiffPixelRatio: 0.02 } as const;
const BACKERS = [
  'Aarav M.',
  'Neha K.',
  'Rohan S.',
  'Priya D.',
  'Kunal B.',
  'Ananya R.',
  'Vikram P.',
  'Sneha T.',
  'Farhan A.',
  'Meghna V.',
];
const EMAIL = 'riya.sharma@gmail.com';
const ARTIFACTS = fileURLToPath(new URL('./artifacts/', import.meta.url));
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async () => {
  await resetEmulators();
});

/** Figma draws modal frames over the plain page colour: hide everything but the dialog. */
async function onlyDialog(page: Page) {
  await page.addStyleTag({
    content: `body > :not(:has([role="dialog"])) { visibility: hidden !important; }
      html, body { background: var(--color-page) !important; }`,
  });
}

/** Lets fonts and images settle before a capture. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (img) => (img.complete ? null : img.decode().catch(() => null))),
    );
  });
}

async function seedHome() {
  await writeDoc('public/stats', { waitlistCount: 12480 });
  await writeDoc('public/backers', { names: BACKERS });
}

async function fillWaitlist(page: Page) {
  const card = page.locator('#waitlist');
  await card.getByLabel('Full name').fill('Riya Sharma');
  await card.getByRole('radio', { name: 'Female' }).click();
  await card.getByRole('radio', { name: '18–24' }).click();
  await card.getByLabel('Email').fill(EMAIL);
}

async function openW02(page: Page) {
  await seedHome();
  await page.goto('/');
  await expect(page.getByText('12,480', { exact: true })).toBeVisible();
  await fillWaitlist(page);
  await page.locator('#waitlist').getByRole('button', { name: 'Join the waitlist' }).click();
  const dialog = page.getByRole('dialog', { name: "You're on the list!" });
  await expect(dialog).toContainText("You're #12,481.");
  await dialog.getByLabel('Username').fill('riya.walks');
  await expect(dialog.getByText('Available', { exact: true })).toBeVisible();
  return dialog;
}

async function fillTeam(page: Page) {
  const form = page.getByRole('form', { name: 'Apply now' });
  await form.getByLabel('Full name').fill('Riya Sharma');
  await form.getByLabel('Email').fill(EMAIL);
  await form.getByLabel('Resume').setInputFiles({
    name: 'Riya_Sharma_Resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
  });
  await expect(form.getByText('Riya_Sharma_Resume.pdf')).toBeVisible();
  await form.getByLabel('Contact number').fill('+91 98765 43210');
}

async function fillFund(page: Page) {
  const form = page.getByRole('form', { name: 'Your details' });
  await form.getByLabel('Name', { exact: true }).fill('Riya Sharma');
  await form.getByLabel('Contact number').fill('+91 98765 43210');
  await form.getByLabel('Or enter an amount (₹)').focus();
}

async function fillAmbassador(page: Page) {
  const form = page.getByRole('form', { name: 'Apply' });
  await form.getByLabel('Full name').fill('Riya Sharma');
  await form.getByLabel('Email').fill(EMAIL);
  await form.getByLabel('Contact number').fill('+91 98765 43210');
  await form.getByLabel('City').fill('Mumbai');
  await form.getByRole('radio', { name: '1k–10k' }).click();
  await form.getByLabel('College or company').fill("St. Xavier's College");
  await form.getByRole('checkbox', { name: /I agree/ }).check();
  await form.getByLabel('Instagram handle').fill('@riya.walks');
}

async function fillFounder(page: Page) {
  const modal = page.getByRole('dialog', { name: 'Connect with the founder' });
  await modal.getByLabel('Your name').fill('Riya Sharma');
  await modal.getByLabel('Email').fill('riya@example.com');
  await modal.getByLabel('Phone (optional)').fill('+91 98765 43210');
  await modal.getByRole('radio', { name: 'Partnership' }).click();
  await modal
    .getByLabel('Message')
    .fill(
      'We run a 2,000-student college in Pune and would love StepQ challenges for our fitness week in December. Can we talk?',
    );
  return modal;
}

test.describe('Figma parity at 1440', () => {
  test.skip(({ isMobile }) => isMobile, 'Figma W frames are 1440 wide');

  test('W01 Home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedHome();
    await page.goto('/');
    await expect(page.getByText('12,480', { exact: true })).toBeVisible();
    await expect(page.getByText('Meghna V.')).toBeVisible();
    await fillWaitlist(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w01.png', PARITY);
  });

  test('W02 Reserve username', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openW02(page);
    await onlyDialog(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w02.png', MODAL_PARITY);
  });

  test('W03 Username reserved', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const w02 = await openW02(page);
    await w02.getByRole('button', { name: 'Reserve @riya.walks' }).click();
    await expect(page.getByRole('dialog', { name: '@riya.walks is yours' })).toBeVisible();
    await onlyDialog(page);
    await page.mouse.move(0, 0);
    await settled(page);
    await expect(page).toHaveScreenshot('w03.png', MODAL_PARITY);
  });

  test('W04 Join the team', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/join-the-team');
    await fillTeam(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w04.png', PARITY);
  });

  test('W05 Application sent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/join-the-team');
    await page.evaluate((email) => sessionStorage.setItem('stepq.teamApplication', email), EMAIL);
    await page.goto('/join-the-team/sent?name=Riya&role=marketing');
    await expect(page.getByText(`reply to ${EMAIL}`)).toBeVisible();
    await settled(page);
    await expect(page).toHaveScreenshot('w05.png', PARITY);
  });

  test('W06 Fund StepQ', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fund');
    await fillFund(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w06.png', PARITY);
  });

  test('W07 Pay with UPI', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fund');
    await fillFund(page);
    await page.getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect(page.getByRole('dialog', { name: 'Scan to pay ₹501' })).toBeVisible();
    await onlyDialog(page);
    await page.mouse.move(0, 0);
    await settled(page);
    await expect(page).toHaveScreenshot('w07.png', MODAL_PARITY);
  });

  test('W08 Thank you for backing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fund/thank-you?amount=501');
    await expect(page.getByText('₹501')).toBeVisible();
    await settled(page);
    await expect(page).toHaveScreenshot('w08.png', PARITY);
  });

  test('W09 Become an ambassador', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ambassadors');
    await fillAmbassador(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w09.png', PARITY);
  });

  test('W10 Ambassador T&C', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ambassadors?modal=terms');
    await expect(page.getByRole('dialog', { name: 'Ambassador Terms & Conditions' })).toBeVisible();
    await onlyDialog(page);
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settled(page);
    await expect(page).toHaveScreenshot('w10.png', MODAL_PARITY);
  });

  test('W11 Application received', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ambassadors/received?name=Riya');
    await expect(page.getByText('Thanks, Riya.')).toBeVisible();
    await settled(page);
    await expect(page).toHaveScreenshot('w11.png', PARITY);
  });

  test('W16 Connect with the founder', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 970 });
    await page.goto('/?modal=founder');
    const modal = await fillFounder(page);
    await expect(modal).toBeVisible();
    await onlyDialog(page);
    await settled(page);
    await expect(page).toHaveScreenshot('w16.png', MODAL_PARITY);
  });

  test('W17 Message sent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?modal=founder');
    const modal = await fillFounder(page);
    await modal.getByRole('button', { name: 'Send to the founder' }).click();
    await expect(page.getByRole('dialog', { name: 'Message sent' })).toBeVisible();
    await onlyDialog(page);
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settled(page);
    await expect(page).toHaveScreenshot('w17.png', MODAL_PARITY);
  });
});

test.describe('phone screenshots (390, saved for review)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone pass');

  const shots: [name: string, path: string][] = [
    ['home', '/'],
    ['join-the-team', '/join-the-team'],
    ['join-the-team-sent', '/join-the-team/sent?name=Riya&role=marketing'],
    ['fund', '/fund'],
    ['fund-thank-you', '/fund/thank-you?amount=501'],
    ['ambassadors', '/ambassadors'],
    ['ambassadors-terms', '/ambassadors?modal=terms'],
    ['ambassadors-received', '/ambassadors/received?name=Riya'],
    ['founder', '/?modal=founder'],
    ['confirm', '/confirm'],
    ['privacy', '/privacy'],
  ];

  test('pages and modals at 390 × 844', async ({ page }) => {
    mkdirSync(ARTIFACTS, { recursive: true });
    await seedHome();
    for (const [name, path] of shots) {
      await page.goto(path);
      await page.waitForTimeout(500);
      await settled(page);
      await page.screenshot({ path: `${ARTIFACTS}${name}-390.png`, fullPage: true });
    }
  });

  test('M01 UPI app sheet on iOS', async ({ browser }) => {
    mkdirSync(ARTIFACTS, { recursive: true });
    const context = await browser.newContext({
      userAgent: IPHONE_UA,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('/fund');
    await fillFund(page);
    await page.getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect(page.getByRole('dialog', { name: 'Pay ₹501 with' })).toBeVisible();
    await settled(page);
    await page.screenshot({ path: `${ARTIFACTS}m01-ios-sheet-390.png` });
    await context.close();
  });
});
