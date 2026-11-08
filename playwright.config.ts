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
  webServer: {
    command: 'npm run dev:test',
    url: 'http://127.0.0.1:5179',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
