import { expect, test, type Page } from '@playwright/test';
import { actionTokenFromMail, readRows, readMail, resetDb, setWaitlistCount } from './helpers/db';

test.beforeEach(async () => {
  await resetDb();
});

const card = (page: Page) => page.locator('#waitlist');
const liveCount = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'joined the waitlist' });
// A closing modal stays in the DOM for its exit animation, so dialogs are found by name.
const w02 = (page: Page) => page.getByRole('dialog', { name: "You're on the list!" });
const w03 = (page: Page, name: string) => page.getByRole('dialog', { name: `@${name} is yours` });

async function join(page: Page, name: string, email: string) {
  const form = card(page);
  await form.getByLabel('Full name').fill(name);
  await form.getByLabel('Email').fill(email);
  await form.getByRole('radio', { name: 'Female' }).click();
  await form.getByRole('radio', { name: '18–24' }).click();
  await form.getByRole('combobox', { name: 'Country' }).fill('India');
  await form.getByRole('option', { name: 'India', exact: true }).click();
  await form.getByRole('button', { name: 'Join the waitlist' }).click();
}

async function waitForLiveCount(page: Page) {
  await expect(liveCount(page)).toHaveText(
    /^\d[\d,]* (people have|person has) joined the waitlist$/,
  );
}

test('the live count updates when someone joins in another browser', async ({ page, browser }) => {
  await page.goto('/');
  await expect(liveCount(page)).toHaveText('0 people have joined the waitlist');

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await waitForLiveCount(page2);
  await join(page2, 'Riya Sharma', 'riya@example.com');
  await expect(w02(page2)).toContainText("You're #1.");
  await other.close();

  await expect(liveCount(page)).toHaveText('1 person has joined the waitlist');
});

test('join → reserve a username → W03; a second person sees it as taken', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await waitForLiveCount(page);
  await join(page, 'Riya Sharma', 'Riya@Example.com');

  const reserve = w02(page);
  await expect(reserve.getByRole('heading', { name: "You're on the list!" })).toBeVisible();
  await expect(reserve).toContainText(
    "You're #1. We'll email riya@example.com the day StepQ launches.",
  );
  await expect(page).toHaveURL(/[?&]modal=reserve/);

  await reserve.getByLabel('Username').fill('riya.walks');
  await expect(reserve.getByText('Available', { exact: true })).toBeVisible();
  await reserve.getByRole('button', { name: 'Reserve @riya.walks' }).click();

  const reserved = w03(page, 'riya.walks');
  await expect(reserved.getByRole('heading', { name: '@riya.walks is yours' })).toBeVisible();
  await expect(reserved).toContainText(
    "It'll be waiting for you when you sign up with riya@example.com.",
  );
  await expect(reserved.getByRole('button', { name: /stepq\.in\/join/ })).toBeVisible();
  await reserved.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/modal=/);

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await waitForLiveCount(page2);
  await join(page2, 'Aman Gupta', 'aman@example.com');
  const second = w02(page2);
  await expect(second).toContainText("You're #2.");
  await second.getByLabel('Username').fill('riya.walks');
  await expect(second.getByText('Taken', { exact: true })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Reserve @riya.walks' })).toBeDisabled();
  await other.close();
});

test('joining again with the same email shows the position and emails a reserve link', async ({
  page,
}) => {
  await page.goto('/');
  await waitForLiveCount(page);
  await join(page, 'Riya Sharma', 'riya@example.com');
  await expect(w02(page)).toContainText("You're #1.");
  await w02(page).getByRole('button', { name: 'Maybe later' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await waitForLiveCount(page);
  await join(page, 'Riya Sharma', ' RIYA@example.com ');
  const dialog = w02(page);
  await expect(dialog).toContainText(
    "You're already on the list (#1). We've emailed you a link to reserve your username.",
  );
  await expect(dialog.getByLabel('Username')).toHaveCount(0);

  await expect
    .poll(async () => (await readMail({ to: 'riya@example.com', template: 'reserveLink' })).length)
    .toBe(1);
  const [mail] = await readMail({ to: 'riya@example.com', template: 'reserveLink' });
  await expect
    .poll(async () => (await readMail({ template: 'reserveLink' }))[0]?.status)
    .toBe('sent');

  // The emailed link opens W02 with that token.
  const res = await page.goto(
    `/?modal=reserve&token=${encodeURIComponent(actionTokenFromMail(mail!))}`,
  );
  expect(res?.headers()['referrer-policy']).toBe('same-origin');
  // The one-time token leaves the address bar at once; W02 keeps it in memory.
  await expect(page).toHaveURL(/\/\?modal=reserve$/);
  const fromLink = page.getByRole('dialog', { name: 'Reserve your username' });
  await fromLink.getByLabel('Username').fill('riya_walks');
  await expect(fromLink.getByText('Available', { exact: true })).toBeVisible();
  await fromLink.getByRole('button', { name: 'Reserve @riya_walks' }).click();
  await expect(w03(page, 'riya_walks')).toContainText("It'll be waiting for you");
  await expect(page).not.toHaveURL(/token=/);
});

test('an empty submit focuses the error summary and marks the fields', async ({ page }) => {
  await page.goto('/');
  await waitForLiveCount(page);
  const form = card(page);
  await form.getByRole('button', { name: 'Join the waitlist' }).click();

  const summary = form.getByRole('alert');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('link')).toHaveCount(5);
  await expect(form.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByRole('radiogroup', { name: 'Gender' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(form.getByRole('radiogroup', { name: 'Age group' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(form.getByRole('combobox', { name: 'Country' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  // Field ids are unique on the page (the founder modal has its own name/email).
  expect(await page.locator('[id="name"], [id="email"]').count()).toBe(0);
});

test('no sample data is shown and the empty backers wall is hidden', async ({ page }) => {
  await page.goto('/');
  await waitForLiveCount(page);
  await expect(
    page.getByRole('heading', { name: 'Walking, made a happy daily habit.' }),
  ).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text).not.toContain('12,480');
  expect(text).not.toContain('12,481');
  expect(text).not.toContain('Aarav M.');
  await expect(page.getByText('Our early backers')).toHaveCount(0);
});

test('/join keeps ref and UTM params and stores them as the source', async ({ page }) => {
  await page.goto('/join?ref=abc&utm_source=ig&x=1');
  await expect(page).toHaveURL(/\/\?ref=abc&utm_source=ig&x=1$/);
  await waitForLiveCount(page);
  await join(page, 'Riya Sharma', 'riya@example.com');
  await expect(w02(page)).toContainText("You're #1.");

  const [entry] = await readRows<{ email: string; source?: string }>('waitlist');
  expect(entry?.email).toBe('riya@example.com');
  expect(entry?.source).toContain('ref=abc');
  expect(entry?.source).toContain('utm_source=ig');
  expect(entry?.source).not.toContain('x=1');
});

test('the live count pill does not change size when a large count arrives (390 px)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setWaitlistCount(1234567);
  // Hold the first live-count read so the pre-data state can be measured.
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/api/public/stats', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/');
  const pill = page.locator('[data-live-pill]');
  await expect(pill).toBeAttached();
  await expect(pill).toBeHidden(); // laid out but invisible
  await expect(pill.locator('xpath=..').getByRole('status')).toHaveText('');
  const before = await pill.boundingBox();

  release();
  await expect(liveCount(page)).toHaveText('12,34,567 people have joined the waitlist');
  await expect(pill).toBeVisible();
  const after = await pill.boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 0);
  expect(after!.height).toBeCloseTo(before!.height, 0);

  // A later change ("1" → many, roll included) keeps the size too.
  await setWaitlistCount(1);
  await expect(liveCount(page)).toHaveText('1 person has joined the waitlist');
  const one = await pill.boundingBox();
  expect(one!.width).toBeCloseTo(before!.width, 0);
  expect(one!.height).toBeCloseTo(before!.height, 0);
});

test('a bare /?modal=reserved link shows nothing and is cleaned up', async ({ page }) => {
  await page.goto('/?modal=reserved&u=admin');
  await waitForLiveCount(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('@admin is yours')).toHaveCount(0);
});

test('desktop pill keeps the dot next to the number (Figma spacing)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(liveCount(page)).toHaveText('0 people have joined the waitlist');
  const pill = page.locator('[data-live-pill]');
  const dot = await pill.locator('.live-dot').boundingBox();
  const number = await pill.getByText('0', { exact: true }).boundingBox();
  expect(number!.x - (dot!.x + dot!.width)).toBeLessThanOrEqual(12);
});
