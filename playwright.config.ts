import { defineConfig, devices } from '@playwright/test';

// macOS 12 cannot run Playwright's bundled Chromium; use the installed Chrome there.
const channel = process.platform === 'darwin' ? 'chrome' : undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel,
    headless: true,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: {
    command: 'npm run dev -w @paragon-ai-mag/web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
