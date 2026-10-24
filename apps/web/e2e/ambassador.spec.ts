import { expect, test, type Page } from '@playwright/test';
import { actionTokenFromMail, readCollection, readMail, resetEmulators } from './helpers/emulator';

test.beforeEach(async () => {
  await resetEmulators();
});

const form = (page: Page) => page.getByRole('form', { name: 'Apply' });
// A closing modal stays in the DOM for its exit animation, so dialogs are found by name.
const terms = (page: Page) => page.getByRole('dialog', { name: 'Ambassador Terms & Conditions' });

async function fill(page: Page) {
  const apply = form(page);
  await apply.getByLabel('Full name').fill('Riya Sharma');
  await apply.getByLabel('Email').fill(' Riya.Sharma@Gmail.com ');
  await apply.getByLabel('Contact number').fill('+91 98765 43210');
  await apply.getByLabel('City').fill('Mumbai');
  await apply.getByLabel('Instagram handle').fill('@riya.walks');
  await apply.getByRole('radio', { name: '1k–10k' }).click();
  await apply.getByLabel('College or company').fill("St. Xavier's College");
  await apply
    .getByLabel('How will you promote StepQ?')
    .fill('Weekly campus walks with my running club.');
}

test('T&C is required and keeps typed values; approve via the signed /confirm page', async ({
  page,
}) => {
  await page.goto('/ambassadors');
  await expect(page.getByRole('heading', { name: 'Become a StepQ ambassador' })).toBeVisible();
  // No eligibility content yet: the Figma placeholder.
  await expect(
    page.getByText(
      'Eligibility criteria and the full terms come from StepQ and will be added here before launch.',
    ),
  ).toBeVisible();

  await fill(page);
  const apply = form(page);
  await apply.getByRole('button', { name: 'Apply to be an ambassador' }).click();
  await expect(apply.locator('#ambassador-agreedToTerms-error')).toHaveText(
    'Please agree to the Terms & Conditions',
  );
  await expect(apply.getByRole('alert').first()).toBeFocused();
  expect(await readCollection('ambassadorApplications')).toHaveLength(0);

  // Open the T&C (W10) and close it: everything typed is still there.
  await apply.getByRole('link', { name: 'Terms & Conditions', exact: true }).click();
  await expect(terms(page)).toBeVisible();
  await expect(page).toHaveURL(/[?&]modal=terms/);
  for (const h of [
    '1. Eligibility',
    '2. What you agree to do',
    '3. Using the StepQ name and logo',
    '4. Rewards',
    '5. Ending the programme',
  ])
    await expect(terms(page).getByRole('heading', { name: h })).toBeVisible();
  await terms(page).getByRole('button', { name: 'Close' }).click();
  await expect(terms(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/modal=terms/);
  await expect(apply.getByLabel('Full name')).toHaveValue('Riya Sharma');
  await expect(apply.getByLabel('Instagram handle')).toHaveValue('@riya.walks');
  await expect(apply.getByRole('radio', { name: '1k–10k' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(apply.getByLabel('How will you promote StepQ?')).toHaveValue(
    'Weekly campus walks with my running club.',
  );
  await expect(apply.getByLabel('I agree to the ambassador')).not.toBeChecked();

  // "I agree" ticks the box; browser Back also closes the modal.
  await apply.getByRole('link', { name: 'Terms & Conditions', exact: true }).click();
  await expect(terms(page)).toBeVisible();
  await page.goBack();
  await expect(terms(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/ambassadors$/);
  await apply.getByRole('link', { name: 'Terms & Conditions', exact: true }).click();
  await terms(page).getByRole('button', { name: 'I agree' }).click();
  await expect(terms(page)).toHaveCount(0);
  await expect(apply.getByLabel('I agree to the ambassador')).toBeChecked();
  await expect(apply.getByLabel('Full name')).toHaveValue('Riya Sharma');

  await apply.getByRole('button', { name: 'Apply to be an ambassador' }).dblclick();
  await expect(page).toHaveURL(/\/ambassadors\/received\?name=Riya$/);
  await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(
    'Thanks, Riya. StepQ will review your application. If you are approved, you will get a congratulations email from StepQ.',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');

  await expect.poll(async () => (await readMail({ template: 'ambassadorAlert' })).length).toBe(1);
  const apps = await readCollection<{ email: string; instagram: string; followers: string }>(
    'ambassadorApplications',
  );
  expect(apps).toHaveLength(1);
  expect(apps[0]).toMatchObject({
    email: 'riya.sharma@gmail.com',
    instagram: 'riya.walks',
    followers: '1k_10k',
  });

  // The founder opens the approve link: the page only describes it until Confirm is pressed.
  const [alert] = await readMail({ template: 'ambassadorAlert' });
  const token = actionTokenFromMail(alert!);
  await page.goto(`/confirm?token=${encodeURIComponent(token)}`);
  await expect(page.getByText('Approve Riya Sharma (Mumbai) as an ambassador?')).toBeVisible();
  await expect(page).toHaveURL(/\/confirm$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(await readMail({ template: 'ambassadorApproved' })).toHaveLength(0);

  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
  await expect
    .poll(async () => (await readMail({ template: 'ambassadorApproved' })).length)
    .toBe(1);
  const [approved] = await readMail({ template: 'ambassadorApproved' });
  expect(approved!.to).toBe('riya.sharma@gmail.com');

  // Opening the link again: already done, and no second email.
  await page.goto(`/confirm?token=${encodeURIComponent(token)}`);
  await expect(page.getByRole('heading', { name: 'Already done' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);
  expect(await readMail({ template: 'ambassadorApproved' })).toHaveLength(1);
});

test('W11 without a name leaves it out, and a long name is capped', async ({ page }) => {
  await page.goto('/ambassadors/received');
  const text = await page.getByRole('main').innerText();
  expect(text).toContain('Thanks. StepQ will review your application.');
  expect(text).not.toContain('Thanks, .');
  await page.goto(`/ambassadors/received?name=${'A'.repeat(200)}`);
  await expect(page.getByRole('main')).toContainText(`Thanks, ${'A'.repeat(60)}. StepQ`);
});

test('an empty submit lists every missing field', async ({ page }) => {
  await page.goto('/ambassadors');
  const apply = form(page);
  await apply.getByRole('button', { name: 'Apply to be an ambassador' }).click();
  const summary = apply.getByRole('alert').first();
  await expect(summary).toBeFocused();
  // name, email, phone, city, instagram, followers, college, plan, T&C
  await expect(summary.getByRole('link')).toHaveCount(9);
  await summary.getByRole('link', { name: /Followers/ }).click();
  await expect(apply.getByRole('radio', { name: 'Under 1k' })).toBeFocused();
});
