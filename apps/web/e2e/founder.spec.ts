import { expect, test, type Page } from '@playwright/test';
import { readCollection, readMail, resetEmulators } from './helpers/emulator';

test.beforeEach(async () => {
  await resetEmulators();
});

// A closing modal stays in the DOM for its exit animation, so dialogs are found by name.
const founder = (page: Page) => page.getByRole('dialog', { name: 'Connect with the founder' });
const sent = (page: Page) => page.getByRole('dialog', { name: 'Message sent' });

test('home strip → pick Investment → W17; the founder gets a reply-to mail', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Connect with the founder' }).click();
  const modal = founder(page);
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL(/[?&]modal=founder/);
  // No topic in the URL: nothing is preselected.
  await expect(modal.getByRole('radio', { checked: true })).toHaveCount(0);
  // The waitlist card on the same page uses other ids.
  expect(await page.locator('[id="name"], [id="email"], [id="message"]').count()).toBe(0);

  await modal.getByLabel('Your name').fill('Riya Sharma');
  await modal.getByLabel('Email').fill('Riya@Example.com');
  await modal.getByLabel('Phone (optional)').fill('+44 20 7946 0958');
  await modal.getByRole('radio', { name: 'Investment' }).click();
  await modal.getByLabel('Message').fill('We run a 2,000-student college in Pune. Can we talk?');
  await modal.getByRole('button', { name: 'Send to the founder' }).dblclick();

  await expect(sent(page)).toBeVisible();
  await expect(sent(page)).toContainText(
    'Thanks, Riya. Your message is on its way to connect@stepq.in. The founder reads every message personally.',
  );
  await expect.poll(async () => (await readMail({ template: 'founderMessage' })).length).toBe(1);
  const [mail] = await readMail({ template: 'founderMessage' });
  expect(mail!.replyTo).toBe('riya@example.com');
  expect(mail!.props).toMatchObject({ topicLabel: 'Investment', phone: '+442079460958' });
  expect(await readCollection('founderMessages')).toHaveLength(1);

  await sent(page).getByRole('button', { name: 'Back to StepQ' }).click();
  await expect(sent(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/modal=/);
});

test('footer "Collaborate with us" preselects Partnership; Esc and Back close it', async ({
  page,
}) => {
  await page.goto('/fund');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Collaborate with us' }).click();
  await expect(founder(page)).toBeVisible();
  await expect(founder(page).getByRole('radio', { name: 'Partnership' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(founder(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/fund$/);

  await page.getByRole('contentinfo').getByRole('link', { name: 'Collaborate with us' }).click();
  await expect(founder(page)).toBeVisible();
  await page.goBack();
  await expect(founder(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/fund$/);

  // A shared link opens it on load, too.
  await page.goto('/join-the-team?modal=founder&topic=press');
  await expect(founder(page).getByRole('radio', { name: 'Press' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await founder(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(founder(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/modal=/);
});

test('an empty send lists the missing fields and sends nothing', async ({ page }) => {
  await page.goto('/?modal=founder');
  const modal = founder(page);
  await modal.getByRole('button', { name: 'Send to the founder' }).click();
  const summary = modal.getByRole('alert').first();
  await expect(summary).toBeFocused();
  // name, email, topic, message (phone is optional)
  await expect(summary.getByRole('link')).toHaveCount(4);
  expect(await readCollection('founderMessages')).toHaveLength(0);
});
