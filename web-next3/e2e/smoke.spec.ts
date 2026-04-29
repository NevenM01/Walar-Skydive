import { test, expect } from '@playwright/test'

const publicPaths = [
  '/',
  '/results',
  '/events',
  '/news',
  '/partners',
  '/partners/become-a-partner',
  '/rules',
  '/login',
  '/request-access',
]

for (const path of publicPaths) {
  test(`smoke: ${path} loads`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.ok(), `expected OK for ${path}, got ${response?.status()}`).toBeTruthy()
    await expect(page.getByTestId('app-main')).toBeVisible()
  })
}

test('register redirects to request-access', async ({ page }) => {
  await page.goto('/register')
  await expect(page).toHaveURL(/\/request-access\/?$/)
})
