import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, DATABASE_URL } from './e2e/helpers/db';

/**
 * End-to-end tests against a local Postgres. Run from the repo root with `pnpm e2e`, which
 * makes sure the database exists (scripts/e2e.mjs). The app is a production build whose API
 * routes use that database; mail is rendered and marked sent without being sent.
 * @playwright/test is pinned to 1.56.1 (Chromium build 1194): locally that build is preinstalled
 * under PLAYWRIGHT_BROWSERS_PATH; CI runs `playwright install --with-deps chromium`.
 */

const PORT = new URL(BASE_URL).port;

export default defineConfig({
  testDir: './e2e',
  // The preview smoke test needs a preview build: `pnpm e2e:preview` (playwright.preview.config.ts).
  testIgnore: 'preview.spec.ts',
  // Every test resets the shared database, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Visual parity baselines ARE the Figma exports in e2e/figma (w01.png …). Never run
    // visual.spec.ts with -u / --update-snapshots: it would overwrite the Figma references.
    toHaveScreenshot: { pathTemplate: '{testDir}/figma/{arg}{ext}' },
  },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      // Pixel 7 is a Chromium device (mobile UA, touch, DPR); sized to the 390 × 844 target.
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    // Always a fresh build: a leftover server would test stale code.
    reuseExistingServer: false,
    env: {
      DATABASE_URL,
      ACTION_SIGNING_SECRET: 'e2e-signing-secret',
      SITE_URL: BASE_URL,
      MAIL_TRANSPORT: 'log',
      NEXT_PUBLIC_PREVIEW_MODE: '',
      NEXT_PUBLIC_PUBLIC_POLL_MS: '1000',
    },
  },
});
