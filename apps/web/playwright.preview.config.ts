import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test of a preview build (`NEXT_PUBLIC_PREVIEW_MODE=1`, no Firebase, no emulators).
 * Run from the repo root with `pnpm e2e:preview`. Only `e2e/preview.spec.ts` runs here; the
 * emulator suite (`pnpm e2e`, playwright.config.ts) skips it.
 */
const PORT = 3200;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Read by e2e/preview.spec.ts in the workers (they inherit this environment).
process.env.PREVIEW_E2E = '1';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'preview.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: false,
    // Only the preview flag: the build must not need any NEXT_PUBLIC_FIREBASE_* value.
    env: { NEXT_PUBLIC_PREVIEW_MODE: '1' },
  },
});
