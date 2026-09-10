import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Le navigateur appelle le proxy same-origin (voir src/app/api/proxy/[...path]/route.ts),
      // qui relaie côté serveur vers API_INTERNAL_URL — seule base réellement interceptée par
      // msw/node (src/instrumentation.ts). Un seul état mocké, partagé par tous les appels.
      NEXT_PUBLIC_API_URL: 'http://localhost:3100/api/proxy',
      API_INTERNAL_URL: 'https://mock.immodesk.internal/v1',
      E2E_MOCK: '1',
    },
  },
});
