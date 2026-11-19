import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:18785';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.browser.spec.mjs',
  use: { baseURL },
  projects: [
    { name: 'Desktop', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
    { name: 'Mobil', use: { ...devices['Pixel 5'], channel: 'msedge' } },
  ],
  webServer: { command: 'node preview.mjs', url: baseURL, env: { PORT: '18785' } },
});