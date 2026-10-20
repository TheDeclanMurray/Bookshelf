import { defineConfig } from '@playwright/test';

const CHROMIUM = process.env.CHROMIUM_PATH;              // set when the browser is not Playwright's own download

export default defineConfig({
  testDir: 'src/tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 780 },
    hasTouch: true,
    launchOptions: CHROMIUM ? { executablePath: CHROMIUM } : {},
  },
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: true },
});
