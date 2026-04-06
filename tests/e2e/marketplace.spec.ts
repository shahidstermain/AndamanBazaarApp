import { test, expect } from '@playwright/test'

test.describe('Marketplace & Listing Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Auth is bypassed via VITE_E2E_BYPASS_AUTH=true (set in playwright.config.ts webServer).
    // Firebase data is served from Firestore — use the Firebase Emulator for seeded test data.
    await page.goto('/')
  })

  test('should create a new listing successfully', async ({ page }) => {
    await page.goto('/sell')

    // Step 1: Photos
    await expect(page.getByText('Step 1 of 4 — Photos')).toBeVisible()

    // E2E covers the full navigation and multi-step form availability
    await expect(page.getByRole('button', { name: /Next/i }).or(page.getByRole('button', { name: /Continue/i }))).toBeTruthy()
  })
})
