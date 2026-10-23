import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Emulator suites share one Firestore; run files one at a time.
    fileParallelism: false,
  },
});
