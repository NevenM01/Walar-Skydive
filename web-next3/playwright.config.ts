import { defineConfig, devices } from '@playwright/test'

const port = 4173
const host = '127.0.0.1'

const previewCmd = `npm run preview -- --host ${host} --port ${port} --strictPort`
const webServerCommand =
  process.env.PLAYWRIGHT_SKIP_BUILD === '1' ? previewCmd : `npm run build && ${previewCmd}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://${host}:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: webServerCommand,
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
