import { defineConfig, devices } from '@playwright/test'

const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? 3101)
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 4173)
const apiUrl = `http://127.0.0.1:${apiPort}`
const webUrl = `http://127.0.0.1:${webPort}`
const reuseExistingServer = process.env.PW_REUSE_SERVER === '1' && !process.env.CI

const e2eEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgres://localhost:5432/fitness',
  JWT_SECRET:
    process.env.JWT_SECRET ??
    'e2e_jwt_secret_min_32_chars_for_local_dev_xx',
  REGISTRATION_KEY: process.env.REGISTRATION_KEY ?? 'e2e-test-key',
  CORS_ORIGIN: webUrl,
  PORT: String(apiPort),
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: webUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'node src/index.js',
      cwd: 'server',
      url: `${apiUrl}/health`,
      reuseExistingServer,
      timeout: 120_000,
      env: e2eEnv,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort}`,
      url: webUrl,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
      },
    },
  ],
})
