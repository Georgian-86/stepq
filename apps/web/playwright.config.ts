import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the Firebase emulators. Run from the repo root with `pnpm e2e`,
 * which builds the Functions and wraps this in `firebase emulators:exec` (functions,
 * firestore, storage). The app is a production build pointed at the emulators.
 * @playwright/test is pinned to 1.56.1 (Chromium build 1194): locally that build is preinstalled
 * under PLAYWRIGHT_BROWSERS_PATH; CI runs `playwright install --with-deps chromium`.
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Every test resets the shared emulator, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_USE_EMULATORS: '1',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-stepq',
    },
  },
});
