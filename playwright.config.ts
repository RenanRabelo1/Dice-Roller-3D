import { defineConfig } from '@playwright/test'

const timedSpecs = /(?:^|[\\/])(?:omen|coin-performance|coin-software|hud|kraken|table-kraken)\.spec\.ts$/

export default defineConfig({
  testDir: 'e2e',
  // The full run raises the worker limit for the parallel project only.
  workers: 1,
  projects: [
    { name: 'paralelo', testIgnore: timedSpecs, fullyParallel: true, outputDir: 'test-results/paralelo' },
    { name: 'sequencial', testMatch: timedSpecs, workers: 1, outputDir: 'test-results/sequencial' },
  ],
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
