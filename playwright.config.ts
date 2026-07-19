import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Dedicated E2E port — away from dev (4211) and the user's phone/Docker instance (8080).
const PORT = 4319;
const DB_FILE_NAME = path.join(process.cwd(), 'data', '.e2e.db');
process.env.DB_FILE_NAME = DB_FILE_NAME; // seen by global-setup (same process)

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1, // one app instance backed by one SQLite file
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The build must already exist (`pnpm build`). CI builds in the same job; locally, build first.
  webServer: {
    command: `pnpm exec tsx e2e/prepare.ts && pnpm exec next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { DB_FILE_NAME, PORT: String(PORT), HOSTNAME: '127.0.0.1' },
  },
});
