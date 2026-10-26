import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readRows, readMail, resetDb } from './helpers/db';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test.beforeEach(async () => {
  await resetDb();
});

const form = (page: Page) => page.getByRole('form', { name: 'Apply now' });
const roleCard = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) });

test('opening a role pre-selects it; a non-PDF is refused; a double submit makes one application', async ({
  page,
}) => {
  await page.goto('/join-the-team');
  await expect(page.getByRole('heading', { name: 'Join the StepQ team' })).toBeVisible();

  // The first role starts open, as in Figma; opening another closes it and selects the new one.
  await expect(roleCard(page, 'Marketing intern')).toHaveAttribute('aria-expanded', 'true');
  await roleCard(page, 'Design intern').click();
  await expect(roleCard(page, 'Design intern')).toHaveAttribute('aria-expanded', 'true');
  await expect(roleCard(page, 'Design intern')).toContainText('Hide JD');
  await expect(roleCard(page, 'Marketing intern')).toHaveAttribute('aria-expanded', 'false');
  // Only the open card shows its JD text (the Figma copy until site.ts has the real one).
  await expect(
    page.getByText(/^The job description for each role is written and shared by StepQ\./),
  ).toHaveCount(4);
  await expect(page.locator('#role-design-jd')).toBeVisible();
  await expect(page.locator('#role-design-jd')).toContainText(
    'It covers what you will work on, the time it needs each week, and who you report to.',
  );
  await expect(page.locator('#role-marketing-jd')).toBeHidden();
  // No JD file yet, so no download row.
  await expect(page.getByText('Download', { exact: true })).toHaveCount(0);
  const apply = form(page);
  await expect(apply.getByLabel('Position applied for')).toHaveValue('design');

  // Changing the select leaves the cards alone.
  await apply.getByLabel('Position applied for').selectOption('tech');
  await expect(roleCard(page, 'Design intern')).toHaveAttribute('aria-expanded', 'true');
  await apply.getByLabel('Position applied for').selectOption('design');

  await apply.getByLabel('Resume').setInputFiles(fixture('fake.pdf'));
  await expect(apply.getByText('Upload a PDF up to 5 MB')).toBeVisible();
  await expect(apply.getByText('fake.pdf')).toHaveCount(0);

  await apply.getByLabel('Resume').setInputFiles(fixture('resume.pdf'));
  await expect(apply.getByText('resume.pdf')).toBeVisible();
  await expect(apply.getByText('PDF, up to 5 MB · uploaded')).toBeVisible();
  await expect(apply.getByText('Upload a PDF up to 5 MB')).toHaveCount(0);

  await apply.getByLabel('Full name').fill('Riya Sharma');
  await apply.getByLabel('Email').fill(' Riya.Sharma@Gmail.com ');
  await apply.getByLabel('Contact number').fill('+91 98765 43210');
  await apply.getByLabel('LinkedIn or portfolio (optional)').fill('linkedin.com/in/riya');
  await apply.getByLabel('Why StepQ?').fill('I want India to walk more, and I love design.');
  await apply.getByRole('button', { name: 'Submit application' }).dblclick();

  await expect(page).toHaveURL(/\/join-the-team\/sent\?name=Riya/);
  await expect(page.getByRole('heading', { name: 'Application sent' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(
    'Thanks, Riya. StepQ will review your application for Design intern (UI and brand) and reply to riya.sharma@gmail.com.',
  );
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');

  await expect
    .poll(async () => (await readMail({ template: 'teamApplicationAlert' })).length)
    .toBe(1);
  const apps = await readRows<{ role: string; email: string; link?: string }>('team_applications');
  expect(apps).toHaveLength(1);
  expect(apps[0]).toMatchObject({
    role: 'design',
    email: 'riya.sharma@gmail.com',
    link: 'https://linkedin.com/in/riya',
  });
});

test('an empty submit lists every missing field and keeps ids unique', async ({ page }) => {
  await page.goto('/join-the-team');
  const apply = form(page);
  await apply.getByLabel('Position applied for').selectOption('tech');
  await apply.getByRole('button', { name: 'Submit application' }).click();
  const summary = apply.getByRole('alert').first();
  await expect(summary).toBeFocused();
  // name, email, phone, resume, why
  await expect(summary.getByRole('link')).toHaveCount(5);
  await expect(summary.getByRole('link', { name: /Resume/ })).toBeVisible();
  await expect(apply.locator('#team-resume-error')).toHaveText('Attach your resume');
  expect(await page.locator('[id="name"], [id="email"], [id="resume"]').count()).toBe(0);
});

test('W05 without a name leaves the name out', async ({ page }) => {
  await page.goto('/join-the-team/sent');
  await expect(page.getByRole('heading', { name: 'Application sent' })).toBeVisible();
  const text = await page.getByRole('main').innerText();
  expect(text).toContain('Thanks. StepQ will review your application');
  expect(text).not.toContain('Thanks, .');
});
