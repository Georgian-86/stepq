import { expect, test, type Locator, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { confirmFromMail, readCollection, readMail, resetEmulators } from './helpers/emulator';

const UPI_BASE = 'upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.beforeEach(async () => {
  await resetEmulators();
});

const form = (page: Page) => page.getByRole('form', { name: 'Your details' });
const payModal = (page: Page, amount: string) =>
  page.getByRole('dialog', { name: `Scan to pay ₹${amount}` });

/** Screenshots the QR (with its white frame as quiet zone) and decodes it. */
async function decodeQr(qr: Locator): Promise<string> {
  const png = PNG.sync.read(await qr.locator('..').screenshot());
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!code) throw new Error('QR code could not be decoded');
  return code.data;
}

async function fillDetails(page: Page) {
  await form(page).getByLabel('Name', { exact: true }).fill('Riya Sharma');
  await form(page).getByLabel('Contact number').fill('+91 98765 43210');
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop flow');

  test('scan card shows the base UPI QR and copies the UPI ID', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/fund');
    await expect(page.getByRole('heading', { name: 'Fund StepQ', level: 1 })).toBeVisible();
    const card = page.getByRole('region', { name: 'Or scan to pay right now' });
    expect(await decodeQr(card.getByRole('img', { name: /QR code/ }))).toBe(UPI_BASE);
    await card.getByRole('button', { name: 'Copy UPI ID' }).click();
    await expect(card.getByRole('status')).toHaveText('Copied');
    await expect(card).toContainText('Add your details on the right so StepQ', {
      useInnerText: true,
    });
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('bhakti0parmar1@oksbi');
  });

  test('pick ₹251 → QR modal with the amount → thank-you; one pending backing', async ({
    page,
  }) => {
    await page.goto('/fund');
    const f = form(page);
    // Figma sample state: ₹501 preselected, wall checkbox on.
    await expect(f.getByRole('radio', { name: '₹501' })).toHaveAttribute('aria-checked', 'true');
    await expect(f.getByLabel('Show my name on the sponsor wall')).toBeChecked();
    await expect(f.getByRole('button', { name: 'Pay ₹501 with UPI' })).toBeVisible();

    await f.getByRole('radio', { name: '₹251' }).click();
    await expect(f.getByRole('button', { name: 'Pay ₹251 with UPI' })).toBeVisible();
    await fillDetails(page);
    await f.getByRole('button', { name: 'Pay ₹251 with UPI' }).dblclick();

    const modal = payModal(page, '251');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('bhakti0parmar1@oksbi')).toBeVisible();
    const link = await decodeQr(modal.getByRole('img', { name: /QR code/ }));
    expect(link.startsWith(UPI_BASE)).toBe(true);
    expect(link).toContain('am=251.00');
    expect(link).toContain('tn=StepQ%20');

    const backings = await readCollection<{ amount: number; status: string; showOnWall: boolean }>(
      'backings',
    );
    expect(backings).toHaveLength(1);
    expect(backings[0]).toMatchObject({ amount: 251, status: 'pending', showOnWall: true });
    await expect.poll(async () => (await readMail({ template: 'backingAlert' })).length).toBe(1);

    await modal.getByRole('button', { name: "I've paid" }).click();
    await expect(page).toHaveURL(/\/fund\/thank-you\?amount=251$/);
    await expect(page.getByRole('heading', { name: 'Thank you for backing StepQ' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(
      'We have recorded your payment of ₹251. Once StepQ verifies it, you will get a personal email and your name will join the sponsor wall.',
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('Other focuses the amount; a custom amount deselects chips; 0 is refused', async ({
    page,
  }) => {
    await page.goto('/fund');
    const f = form(page);
    const amount = f.getByLabel('Or enter an amount (₹)');
    await expect(amount).toHaveValue('501');

    await f.getByRole('radio', { name: 'Other' }).click();
    await expect(amount).toBeFocused();
    await expect(f.getByRole('button', { name: 'Pay with UPI' })).toBeVisible();

    await amount.fill('1001');
    await expect(f.getByRole('button', { name: 'Pay ₹1,001 with UPI' })).toBeVisible();
    for (const chip of ['₹101', '₹251', '₹501', '₹1,001'])
      await expect(f.getByRole('radio', { name: chip })).toHaveAttribute('aria-checked', 'false');

    await fillDetails(page);
    await amount.fill('0');
    await f.getByRole('button', { name: 'Pay with UPI' }).click();
    await expect(f.locator('#fund-amount-error')).toHaveText('Enter an amount');
    await expect(payModal(page, '0')).toHaveCount(0);
    expect(await readCollection('backings')).toHaveLength(0);
  });

  test('Cancel closes the pay modal and leaves the form', async ({ page }) => {
    await page.goto('/fund');
    await fillDetails(page);
    await form(page).getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    const modal = payModal(page, '501');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0);
    await expect(page).toHaveURL(/\/fund$/);
  });

  test('once StepQ verifies the backing, the home wall shows the name live', async ({
    page,
    browser,
  }) => {
    const home = await (await browser.newContext()).newPage();
    await home.goto('/');
    await expect(home.getByText('Our early backers')).toHaveCount(0);

    await page.goto('/fund');
    await fillDetails(page);
    await form(page).getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect(payModal(page, '501')).toBeVisible();

    await expect.poll(async () => (await readMail({ template: 'backingAlert' })).length).toBe(1);
    const [mail] = await readMail({ template: 'backingAlert' });
    await confirmFromMail(mail!);

    const wall = home.getByRole('region', { name: 'Our early backers' });
    await expect(wall.getByRole('listitem')).toHaveText(['Riya S.']);
    expect((await readCollection<{ status: string }>('backings'))[0]?.status).toBe('verified');
  });

  test('W08 without a valid amount leaves the amount out', async ({ page }) => {
    for (const q of ['', '?amount=abc', '?amount=0', '?amount=100001', '?amount=1.5']) {
      await page.goto(`/fund/thank-you${q}`);
      await expect(page.getByRole('main')).toContainText(
        'We have recorded your payment. Once StepQ verifies it, you will get a personal email',
      );
    }
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});

test.describe('Android', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone flow');

  test('Pay opens the UPI app link, then offers "I\'ve paid" and Back', async ({ page }) => {
    await page.goto('/fund');
    // Chromium hands upi:// to the OS; record the navigation request instead.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.enable');
    const navigations: string[] = [];
    cdp.on('Page.frameRequestedNavigation', (e) => navigations.push(e.url));

    await fillDetails(page);
    await form(page).getByRole('button', { name: 'Pay ₹501 with UPI' }).click();
    await expect.poll(() => navigations.find((u) => u.startsWith('upi://'))).toBeTruthy();
    const link = navigations.find((u) => u.startsWith('upi://'))!;
    expect(link.startsWith(UPI_BASE)).toBe(true);
    expect(link).toContain('am=501.00');
    expect(link).toContain('tn=StepQ%20');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // If Chrome blocked the automatic hand-off, the same link is one tap away.
    await expect(page.getByRole('link', { name: 'Open UPI app' })).toHaveAttribute('href', link);
    expect(await readCollection('backings')).toHaveLength(1);

    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await page.getByRole('button', { name: "I've paid" }).click();
    await expect(page).toHaveURL(/\/fund\/thank-you\?amount=501$/);
  });
});

test.describe('phone layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout');

  test('the form comes before the scan card, whose copy points up', async ({ page }) => {
    await page.goto('/fund');
    const formBox = await form(page).boundingBox();
    const card = page.getByRole('region', { name: 'Or scan to pay right now' });
    const cardBox = await card.boundingBox();
    expect(cardBox!.y).toBeGreaterThan(formBox!.y + formBox!.height);
    await expect(card).toContainText('Add your details above so StepQ', { useInnerText: true });
    await expect(card).not.toContainText('on the right', { useInnerText: true });
  });
});

test.describe('iOS', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone flow');
  test.use({ userAgent: IPHONE_UA });

  test('Pay opens the app sheet with five UPI apps', async ({ page }) => {
    await page.goto('/fund');
    await fillDetails(page);
    await form(page).getByRole('radio', { name: '₹101' }).click();
    await form(page).getByRole('button', { name: 'Pay ₹101 with UPI' }).click();

    const sheet = page.getByRole('dialog', { name: 'Pay ₹101 with' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Your phone shows the UPI apps you have installed.');
    const links = sheet.getByRole('link');
    await expect(links).toHaveText(['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Other UPI app']);
    const hrefs = await links.evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''));
    const rest = hrefs[4]!.replace('upi://pay?', '');
    expect(hrefs[4]!.startsWith(UPI_BASE)).toBe(true);
    expect(rest).toContain('am=101.00');
    expect(rest).toContain('tn=StepQ%20');
    expect(hrefs).toEqual([
      `gpay://upi/pay?${rest}`,
      `phonepe://pay?${rest}`,
      `paytmmp://pay?${rest}`,
      `upi://pay?${rest}`,
      `upi://pay?${rest}`,
    ]);

    await sheet.getByRole('button', { name: "I've paid" }).click();
    await expect(page).toHaveURL(/\/fund\/thank-you\?amount=101$/);
  });
});
