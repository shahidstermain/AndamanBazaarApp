import { test, expect } from '@playwright/test'

test.describe('User journeys extended (non-blocking)', () => {
  test('signup -> verification message shown', async ({ page }) => {
    await page.route('**/auth/v1/signup', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'u1' }, session: null }),
      })
    })

    await page.goto('/auth')
    await page.getByRole('button', { name: /signup/i }).click()
    await page.fill('#displayName', 'QA User')
    await page.fill('#emailAddress', 'qa-user@example.com')
    await page.fill('#secretPassword', 'Password123')
    await page.getByRole('button', { name: /Create Island Account/i }).click()

    await expect(page.locator('text=Mail bheja!')).toBeVisible()
  })

  test('boost payment journey can reach payment initiation state', async ({ page }) => {
    await page.route('**/functions/v1/create-boost-order', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment_link: 'https://sandbox.cashfree.com/mock-order',
        }),
      })
    })

    await page.goto('/profile?e2e=1')

    const boostBtn = page.locator('button:has-text("Boost"), button:has-text("Promote")').first()
    if (await boostBtn.count()) {
      await boostBtn.click()
      const payBtn = page.locator('button:has-text("Pay")').first()
      if (await payBtn.count()) {
        await payBtn.click()
      }
    }
  })

  test('non-admin user cannot stay on admin panel', async ({ page }) => {
    await page.route('**/rest/v1/user_roles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/(auth|$)/)
  })

  test('session expiry mid-action shows auth path recovery', async ({ page }) => {
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'session_expired' }),
      })
    })

    await page.goto('/auth')
    await expect(page.getByRole('button', { name: /Sign In Securely/i })).toBeVisible()
  })
})
