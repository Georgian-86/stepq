import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetDb, seedBackers, setWaitlistCount } from './helpers/db';

/**
 * Figma visual parity (spec §4). Each W1 frame's state is rendered at 1440 wide with reduced
 * motion and compared with the Figma export itself (`e2e/figma/*.png` is the baseline, see
 * playwright.config.ts). NEVER run this spec with `-u` / `--update-snapshots`: that would
 * overwrite the Figma references with our own render. The Figma sample values (12,480 people,
 * #12,481, the backer names) exist only in the test database inside these tests. Modal frames are
 * drawn in Figma over a blank page, so the page behind the dialog is hidden here.
 *
 * The 2 % pixel budget alone can miss whole light sections (mint cards on white sit inside the
 * comparison threshold), so every test first asserts the frame's structure: headings, cards,
 * fields and buttons are there and actually painted.
 *
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

test.beforeEach(async ({ page }) => {
  await resetDb();
  // Two client-requested changes on top of Figma: the desktop nav is 80 px (Figma 136) and the
  // hero Piko has a handwritten note. Restore the Figma nav height and hide the note (it keeps
  // its layout box) so everything else in each frame is still compared against Figma.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = `header > nav { min-height: 136px !important; padding-block: 18px !important; }
        [data-piko-note] { visibility: hidden !important; }`;
      document.head.appendChild(style);
    });
  });
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
  await setWaitlistCount(12480);
  await seedBackers(BACKERS);
}

async function fillWaitlist(page: Page) {
  const card = page.locator('#waitlist');
  await card.getByLabel('Full name').fill('Riya Sharma');
  await card.getByRole('radio', { name: 'Female' }).click();
  await card.getByRole('radio', { name: '18–24' }).click();
  await card.getByLabel('Country').selectOption('India');
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

/**
 * Visible and actually painted. Playwright's toBeVisible ignores opacity, so a section faded
 * out (e.g. a Reveal that never ran) would still count as visible.
 */
async function expectShown(...locators: Locator[]) {
  for (const l of locators) {
    await expect(l).toBeVisible();
    // Polled: a dialog that has just opened may still be on its first (fade-in) frame.
    await expect
      .poll(
        () =>
          l.evaluate((el) => {
            let o = 1;
            for (let n: Element | null = el; n; n = n.parentElement)
              o *= Number(getComputedStyle(n).opacity);
            return o;
          }),
        { message: `${l} is transparent`, timeout: 2000 },
      )
      .toBeGreaterThan(0.99);
  }
}

/** Every match of `l` (exactly `count` of them) is shown. */
async function expectAllShown(l: Locator, count: number) {
  await expect(l).toHaveCount(count);
  for (let i = 0; i < count; i++) await expectShown(l.nth(i));
}

const h = (scope: Page | Locator, name: string, level?: number) =>
  scope.getByRole('heading', { name, exact: true, ...(level ? { level } : {}) });

/** Nav and footer of every page frame. */
async function expectChrome(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expectShown(
    nav.getByRole('link', { name: 'StepQ home' }),
    nav.getByRole('link', { name: 'Join the team' }),
    nav.getByRole('link', { name: 'Fund StepQ' }),
    nav.getByRole('link', { name: 'Ambassadors' }),
    page.getByRole('banner').getByRole('link', { name: 'Join the waitlist' }),
  );
  const footer = page.getByRole('contentinfo');
  await expectShown(h(footer, 'Get involved'), h(footer, 'Company'), h(footer, 'Contact'));
  await expectAllShown(footer.getByRole('link'), await footer.getByRole('link').count());
  expect(await footer.getByRole('link').count()).toBeGreaterThanOrEqual(7);
}

async function expectW01(page: Page) {
  await expectChrome(page);
  await expectShown(
    page.getByText('Launching soon on Android and iPhone'),
    h(page, 'Walking, made a happy daily habit.', 1),
    page.getByText('Piko pays you to walk.'),
    page.getByRole('status').filter({ hasText: '12,480 people have joined the waitlist' }),
  );
  const card = page.locator('#waitlist');
  await expectShown(
    h(card, 'Join the waitlist', 2),
    card.getByLabel('Full name'),
    card.getByLabel('Email'),
    card.getByLabel('Country'),
    card.getByRole('button', { name: 'Join the waitlist' }),
    card.getByText('We only email you about StepQ. No spam, ever.'),
  );
  await expectAllShown(card.getByRole('radiogroup', { name: 'Gender' }).getByRole('radio'), 4);
  await expectAllShown(card.getByRole('radiogroup', { name: 'Age group' }).getByRole('radio'), 6);

  const how = page.getByRole('region', { name: 'How StepQ works' });
  await expectShown(h(how, 'How StepQ works', 2));
  await expectAllShown(how.getByRole('heading', { level: 3 }), 3);
  await expectShown(
    h(how, 'Hit your StepQ score'),
    h(how, 'Earn while you walk'),
    h(how, 'Walk together'),
  );

  const help = page.getByRole('region', { name: 'Help build StepQ before launch' });
  await expectShown(
    h(help, 'Help build StepQ before launch', 2),
    help.getByText('Three ways to be part of StepQ from day one.'),
  );
  for (const [title, cta] of [
    ['Join the team', 'See open roles'],
    ['Fund StepQ', 'Fund StepQ'],
    ['Become an ambassador', 'Apply to be an ambassador'],
  ] as const) {
    const cardItem = help.getByRole('listitem').filter({ has: h(page, title, 3) });
    await expectShown(h(cardItem, title, 3), cardItem.getByRole('link', { name: cta }));
  }
  const wall = page.getByRole('region', { name: 'Our early backers' });
  await expectShown(h(wall, 'Our early backers'));
  await expectAllShown(wall.getByRole('listitem'), 10);
  await expectShown(
    h(page, 'Talk to the founder', 3),
    page.getByRole('link', { name: 'Connect with the founder' }),
  );
}

async function expectTeamPage(page: Page) {
  await expectChrome(page);
  await expectShown(h(page, 'Join the StepQ team', 1), h(page, 'Open roles', 2));
  const roles = page
    .getByRole('button', { expanded: true })
    .or(page.getByRole('button', { expanded: false }));
  await expectAllShown(roles.filter({ hasText: /Manager|Executive|Intern/ }), 6);
  await expectShown(page.locator('#role-growth-jd'));
  const form = page.getByRole('form', { name: 'Apply now' });
  await expectShown(
    h(form, 'Apply now', 2),
    form.getByLabel('Full name'),
    form.getByLabel('Email'),
    form.getByLabel('Contact number'),
    form.getByLabel('Position applied for'),
    form.getByText('Riya_Sharma_Resume.pdf'),
    form.getByLabel('LinkedIn or portfolio (optional)'),
    form.getByLabel('Why StepQ?'),
    form.getByRole('button', { name: 'Submit application' }),
  );
}

async function expectFundPage(page: Page) {
  await expectChrome(page);
  await expectShown(h(page, 'Fund StepQ', 1));
  for (const step of [
    'Fill in your details',
    'Pay with any UPI app',
    'StepQ verifies your payment',
  ])
    await expectShown(h(page, step, 2));
  const scan = page.getByRole('region', { name: 'Or scan to pay right now' });
  await expectShown(
    h(scan, 'Or scan to pay right now'),
    scan.getByRole('img', { name: /QR code/ }),
    scan.getByText('bhakti0parmar1@oksbi'),
  );
  const form = page.getByRole('form', { name: 'Your details' });
  await expectShown(
    h(form, 'Your details', 2),
    form.getByLabel('Name', { exact: true }),
    form.getByLabel('Contact number'),
    form.getByLabel('Or enter an amount (₹)'),
    form.getByText('Show my name on the sponsor wall'),
    form.getByRole('button', { name: 'Pay ₹501 with UPI' }),
  );
  await expectAllShown(form.getByRole('radiogroup', { name: 'Amount' }).getByRole('radio'), 5);
}

async function expectAmbassadorPage(page: Page) {
  await expectChrome(page);
  await expectShown(
    h(page, 'Become a StepQ ambassador', 1),
    h(page, 'What ambassadors do', 2),
    h(page, 'Who can apply', 2),
  );
  const duties = page
    .getByRole('region', { name: 'Become a StepQ ambassador' })
    .getByRole('listitem');
  await expectAllShown(duties, 3);
  const form = page.getByRole('form', { name: 'Apply' });
  await expectShown(
    h(form, 'Apply', 2),
    form.getByLabel('Full name'),
    form.getByLabel('Email'),
    form.getByLabel('Contact number'),
    form.getByLabel('City'),
    form.getByLabel('Instagram handle'),
    form.getByLabel('College or company'),
    form.getByLabel('How will you promote StepQ?'),
    form.getByText('I agree to the ambassador'),
    form.getByRole('link', { name: 'Terms & Conditions' }),
    form.getByRole('button', { name: 'Apply to be an ambassador' }),
  );
  await expectAllShown(form.getByRole('radiogroup', { name: 'Followers' }).getByRole('radio'), 4);
}

/** W05, W08, W11: Piko, title, message and the way home. */
async function expectConfirmation(page: Page, title: string, message: string) {
  await expectChrome(page);
  await expectShown(
    h(page, title, 1),
    page.getByRole('main').getByText(message),
    page.getByRole('main').getByRole('link', { name: 'Back to home' }),
  );
}

async function expectFounderModal(modal: Locator) {
  await expectShown(
    h(modal, 'Connect with the founder', 2),
    modal.getByText('Ideas, partnerships, feedback or investment?'),
    modal.getByLabel('Your name'),
    modal.getByLabel('Email'),
    modal.getByLabel('Phone (optional)'),
    modal.getByLabel('Message'),
    modal.getByRole('button', { name: 'Send to the founder' }),
    modal.getByRole('button', { name: 'Cancel' }),
    modal.getByText('Your message is emailed to connect@stepq.in.'),
  );
  await expectAllShown(
    modal.getByRole('radiogroup', { name: 'What is it about?' }).getByRole('radio'),
    5,
  );
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
    await expectW01(page);
    // No pixel comparison: the join-the-team card now lists StepQ's real roles, longer than
    // Figma's placeholder copy, which shifts everything below it. Layout is checked above.
  });

  test('W02 Reserve username', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openW02(page);
    await onlyDialog(page);
    await settled(page);
    const w02 = page.getByRole('dialog', { name: "You're on the list!" });
    await expectShown(
      h(w02, "You're on the list!", 2),
      w02.getByText("You're #12,481."),
      h(w02, 'Reserve your username', 3),
      w02.getByLabel('Username'),
      w02.getByText('Available', { exact: true }),
      w02.getByRole('button', { name: 'Reserve @riya.walks' }),
      w02.getByRole('button', { name: 'Maybe later' }),
    );
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
    const w03 = page.getByRole('dialog', { name: '@riya.walks is yours' });
    await expectShown(
      h(w03, '@riya.walks is yours', 2),
      w03.getByText("It'll be waiting for you when you sign up with"),
      w03.getByRole('button', { name: /stepq\.in\/join/ }),
      w03.getByRole('button', { name: 'Done' }),
    );
    await expect(page).toHaveScreenshot('w03.png', MODAL_PARITY);
  });

  test('W04 Join the team', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/join-the-team');
    await fillTeam(page);
    await settled(page);
    await expectTeamPage(page);
    // No pixel comparison: StepQ's six real roles and full job descriptions replace the four
    // placeholder roles in Figma, so the page is a different height. Layout is checked above.
  });

  test('W05 Application sent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/join-the-team');
    await page.evaluate((email) => sessionStorage.setItem('stepq.teamApplication', email), EMAIL);
    await page.goto('/join-the-team/sent?name=Riya&role=growth');
    await expect(page.getByText(`reply to ${EMAIL}`)).toBeVisible();
    await settled(page);
    await expectConfirmation(
      page,
      'Application sent',
      'Thanks, Riya. StepQ will review your application for Growth Marketing Executive',
    );
    await expect(page).toHaveScreenshot('w05.png', PARITY);
  });

  test('W06 Fund StepQ', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fund');
    await fillFund(page);
    await settled(page);
    await expectFundPage(page);
    // No pixel comparison: the intro and step 3 no longer promise an email (the form takes a
    // phone number), so the copy differs from Figma. Layout is checked above.
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
    const w07 = page.getByRole('dialog', { name: 'Scan to pay ₹501' });
    await expectShown(
      h(w07, 'Scan to pay ₹501', 2),
      w07.getByText('Open any UPI app on your phone and scan this code.'),
      w07.getByRole('img', { name: /QR code/ }),
      w07.getByText('bhakti0parmar1@oksbi'),
      w07.getByRole('button', { name: "I've paid" }),
      w07.getByRole('button', { name: 'Cancel' }),
    );
    await expect(page).toHaveScreenshot('w07.png', MODAL_PARITY);
  });

  test('W08 Thank you for backing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fund/thank-you?amount=501');
    await expect(page.getByText('₹501')).toBeVisible();
    await settled(page);
    await expectConfirmation(
      page,
      'Thank you for backing StepQ',
      'We have recorded your payment of ₹501.',
    );
    await expect(page).toHaveScreenshot('w08.png', PARITY);
  });

  test('W09 Become an ambassador', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ambassadors');
    await fillAmbassador(page);
    await settled(page);
    await expectAmbassadorPage(page);
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
    const w10 = page.getByRole('dialog', { name: 'Ambassador Terms & Conditions' });
    await expectShown(
      h(w10, 'Ambassador Terms & Conditions', 2),
      w10.getByRole('button', { name: 'Close' }),
      w10.getByRole('button', { name: 'I agree' }),
    );
    await expectAllShown(w10.getByRole('heading', { level: 3 }), 5);
    // No pixel comparison: StepQ's terms are longer than Figma's placeholder lines.
    // Structure is checked above.
  });

  test('W11 Application received', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ambassadors/received?name=Riya');
    await expect(page.getByText('Thanks, Riya.')).toBeVisible();
    await settled(page);
    await expectConfirmation(
      page,
      'Application received',
      'Thanks, Riya. StepQ will review your application.',
    );
    await expect(page).toHaveScreenshot('w11.png', PARITY);
  });

  test('W16 Connect with the founder', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 970 });
    await page.goto('/?modal=founder');
    const modal = await fillFounder(page);
    await expect(modal).toBeVisible();
    await onlyDialog(page);
    await settled(page);
    await expectFounderModal(modal);
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
    const w17 = page.getByRole('dialog', { name: 'Message sent' });
    await expectShown(
      h(w17, 'Message sent', 2),
      w17.getByText('Thanks, Riya. Your message is on its way to connect@stepq.in.'),
      w17.getByRole('button', { name: 'Back to StepQ' }),
    );
    await expect(page).toHaveScreenshot('w17.png', MODAL_PARITY);
  });
});

test.describe('phone screenshots (390, saved for review)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone pass');

  const shots: [name: string, path: string][] = [
    ['home', '/'],
    ['join-the-team', '/join-the-team'],
    ['join-the-team-sent', '/join-the-team/sent?name=Riya&role=growth'],
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
