import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { actionTokenFromMail, callFunction, readMail, resetEmulators } from './helpers/emulator';

/**
 * Accessibility gates (spec §8): axe on every route and open modal (no serious or critical
 * violations), keyboard-only runs of the waitlist and founder flows, and no running animation
 * under prefers-reduced-motion.
 */

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.beforeEach(async () => {
  await resetEmulators();
});

/** Runs axe (WCAG 2.1 A/AA + best practice) and fails on serious or critical violations. */
async function expectNoSeriousViolations(page: Page) {
  // Modals, toggles and the live count fade in: let finite animations end before axe reads
  // colours (the looping ones, Piko's walk and the live dot, never do).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  expect(serious).toEqual([]);
}

async function joinWaitlist(page: Page) {
  const card = page.locator('#waitlist');
  await card.getByLabel('Full name').fill('Riya Sharma');
  await card.getByLabel('Email').fill('riya@example.com');
  await card.getByRole('radio', { name: 'Female' }).click();
  await card.getByRole('radio', { name: '18–24' }).click();
  await card.getByRole('button', { name: 'Join the waitlist' }).click();
  return page.getByRole('dialog', { name: "You're on the list!" });
}

test.describe('axe: routes', () => {
  const routes: [name: string, path: string, ready: string][] = [
    ['home', '/', 'Walking, made a happy daily habit.'],
    ['join the team', '/join-the-team', 'Join the StepQ team'],
    ['application sent', '/join-the-team/sent?name=Riya&role=marketing', 'Application sent'],
    ['fund', '/fund', 'Fund StepQ'],
    ['thank you', '/fund/thank-you?amount=501', 'Thank you for backing StepQ'],
    ['ambassadors', '/ambassadors', 'Become a StepQ ambassador'],
    ['application received', '/ambassadors/received?name=Riya', 'Application received'],
    ['privacy', '/privacy', 'Privacy policy'],
  ];
  for (const [name, path, heading] of routes) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      if (path === '/')
        await expect(
          page.getByRole('status').filter({ hasText: 'joined the waitlist' }),
        ).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test('confirm: invalid link, then a valid one before and after Confirm', async ({ page }) => {
    await page.goto('/confirm?token=not-a-real.token');
    await expect(page.getByText('This link is not valid.')).toBeVisible();
    await expectNoSeriousViolations(page);

    await callFunction('recordBacking', {
      name: 'Riya Sharma',
      phone: '9876543210',
      amount: 251,
      showOnWall: true,
      website: '',
      requestId: randomUUID(),
    });
    await expect.poll(async () => (await readMail({ template: 'backingAlert' })).length).toBe(1);
    const [alert] = await readMail({ template: 'backingAlert' });
    await page.goto(`/confirm?token=${encodeURIComponent(actionTokenFromMail(alert!))}`);
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expectNoSeriousViolations(page);
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe('axe: modals', () => {
  test('W02 reserve username and W03 reserved', async ({ page }) => {
    await page.goto('/');
    const w02 = await joinWaitlist(page);
    await expect(w02).toContainText("You're #1.");
    await w02.getByLabel('Username').fill('riya.walks');
    await expect(w02.getByText('Available', { exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);
    await w02.getByRole('button', { name: 'Reserve @riya.walks' }).click();
    await expect(page.getByRole('dialog', { name: '@riya.walks is yours' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('W16 founder modal, its errors, and W17', async ({ page }) => {
    await page.goto('/?modal=founder');
    const modal = page.getByRole('dialog', { name: 'Connect with the founder' });
    await expect(modal).toBeVisible();
    await expectNoSeriousViolations(page);
    await modal.getByRole('button', { name: 'Send to the founder' }).click();
    await expect(modal.getByRole('alert').first()).toBeFocused();
    await expectNoSeriousViolations(page);

    await modal.getByLabel('Your name').fill('Riya Sharma');
    await modal.getByLabel('Email').fill('riya@example.com');
    await modal.getByRole('radio', { name: 'Feedback' }).click();
    await modal.getByLabel('Message').fill('Lovely idea.');
    await modal.getByRole('button', { name: 'Send to the founder' }).click();
    await expect(page.getByRole('dialog', { name: 'Message sent' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('W10 ambassador T&C', async ({ page }) => {
    await page.goto('/ambassadors?modal=terms');
    await expect(page.getByRole('dialog', { name: 'Ambassador Terms & Conditions' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('W07 pay with UPI (desktop)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the QR modal is the desktop flow');
    await page.goto('/fund');
    const form = page.getByRole('form', { name: 'Your details' });
    await form.getByLabel('Name', { exact: true }).fill('Riya Sharma');
    await form.getByLabel('Contact number').fill('+91 98765 43210');
    await form.getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect(page.getByRole('dialog', { name: 'Scan to pay ₹501' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('phone nav menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the menu sheet is the phone nav');
    await page.goto('/');
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Fund StepQ' }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe('axe: M01 iOS UPI sheet', () => {
  test.use({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844 } });

  test('M01 sheet', async ({ page }) => {
    await page.goto('/fund');
    const form = page.getByRole('form', { name: 'Your details' });
    await form.getByLabel('Name', { exact: true }).fill('Riya Sharma');
    await form.getByLabel('Contact number').fill('+91 98765 43210');
    await form.getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect(page.getByRole('dialog', { name: 'Pay ₹501 with' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe('keyboard only', () => {
  test.skip(({ isMobile }) => isMobile, 'hardware keyboard flows');

  test('waitlist → reserve a username → W03', async ({ page }) => {
    await page.goto('/');
    // From the top of the page: skip link, then the nav CTA jumps to the waitlist card.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    const card = page.locator('#waitlist');
    const name = card.getByLabel('Full name');
    for (let i = 0; i < 20 && !(await name.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab');
    await expect(name).toBeFocused();

    await page.keyboard.type('Riya Sharma');
    await page.keyboard.press('Tab');
    await expect(card.getByLabel('Email')).toBeFocused();
    await page.keyboard.type('riya@example.com');
    // Radio groups: Tab enters the group, arrows choose.
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // Male
    await page.keyboard.press('ArrowLeft'); // Female
    await expect(card.getByRole('radio', { name: 'Female' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // 18–24
    await expect(card.getByRole('radio', { name: '18–24' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Tab');
    await expect(card.getByRole('button', { name: 'Join the waitlist' })).toBeFocused();
    await page.keyboard.press('Enter');

    const w02 = page.getByRole('dialog', { name: "You're on the list!" });
    await expect(w02).toContainText("You're #1.");
    const username = w02.getByLabel('Username');
    await expect(username).toBeFocused();
    await page.keyboard.type('riya.walks');
    await expect(w02.getByText('Available', { exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(w02.getByRole('button', { name: 'Reserve @riya.walks' })).toBeFocused();
    await page.keyboard.press('Enter');

    const w03 = page.getByRole('dialog', { name: '@riya.walks is yours' });
    await expect(w03).toBeVisible();
    await expect(w03.locator(':focus')).toHaveCount(1);
    // Focus stays inside the dialog.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      await expect(w03.locator(':focus')).toHaveCount(1);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('home strip → founder modal → W17', async ({ page }) => {
    await page.goto('/');
    const strip = page.getByRole('link', { name: 'Connect with the founder' });
    for (let i = 0; i < 60 && !(await strip.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab');
    await expect(strip).toBeFocused();
    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog', { name: 'Connect with the founder' });
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Your name')).toBeFocused();
    await page.keyboard.type('Riya Sharma');
    await page.keyboard.press('Tab');
    await page.keyboard.type('riya@example.com');
    await page.keyboard.press('Tab');
    await expect(modal.getByLabel('Phone (optional)')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // Investment
    await expect(modal.getByRole('radio', { name: 'Investment' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Tab');
    await expect(modal.getByLabel('Message')).toBeFocused();
    await page.keyboard.type('Can we talk about a college partnership?');
    await page.keyboard.press('Tab');
    await expect(modal.getByRole('button', { name: 'Send to the founder' })).toBeFocused();
    await page.keyboard.press('Enter');

    const sent = page.getByRole('dialog', { name: 'Message sent' });
    await expect(sent).toBeVisible();
    await expect(sent.getByRole('button', { name: 'Back to StepQ' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(strip).toBeFocused();
  });
});

test.describe('reduced motion', () => {
  const pages = [
    '/',
    '/?modal=founder',
    '/join-the-team/sent?name=Riya&role=marketing',
    '/fund/thank-you?amount=501',
    '/ambassadors/received?name=Riya',
  ];
  for (const path of pages) {
    test(`nothing animates on ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      // (The Firestore listen channel keeps the network busy, so no 'networkidle'.)
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => (a.effect as KeyframeEffect | null)?.target?.className ?? '?'),
      );
      expect(running).toEqual([]);
    });
  }
});
