import { defineConfig, devices } from '@playwright/test';

const PORT = 3110;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'node server/index.js',
    port: PORT,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      INVITE_CODE: 'test-e2e-2026',
      ADMIN_CODE: 'test-e2e-admin-2026',
      VOTES_DB: 'e2e/.tmp/e2e.db',
      ENTITIES_PATH: 'data/entities.json',
      SKIP_BACKUP: '1',
      PORT: String(PORT),
    },
  },
});
