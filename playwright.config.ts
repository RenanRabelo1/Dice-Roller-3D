import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://127.0.0.1:5179',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] },
  },
  webServer: [
    {
      command: 'npm run dev:test',
      url: 'http://127.0.0.1:5179',
      reuseExistingServer: false,
      timeout: 60_000,
      // The test build sends the roll history to the stub below; e2e/history.spec.ts intercepts it with page.route.
      env: { VITE_API_URL: 'http://127.0.0.1:5180' },
    },
    {
      // Answers 204 (with CORS) to every request, so a POST no test intercepts leaves the console clean.
      command: 'node e2e/api-stub.mjs',
      url: 'http://127.0.0.1:5180',
      reuseExistingServer: false,
      timeout: 10_000,
    },
  ],
})
