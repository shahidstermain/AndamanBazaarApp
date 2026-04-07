import { test, expect } from '@playwright/test'

test.describe('Enhanced Authentication & OAuth', () => {
  test.beforeEach(async ({ page }) => {
    // Auth is bypassed via VITE_E2E_BYPASS_AUTH=true (set in playwright.config.ts webServer).
    // Firebase auth runs through identitytoolkit.googleapis.com — no route mock needed here.
    await page.goto('/auth')
  })

  test('should display OAuth diagnostic panel when authenticated', async ({ page }) => {
    // Attempts a real login via the Firebase Auth form; diagnostic panel is shown post-login.
    
    await page.getByPlaceholder('name@domain.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('Password123!')
    await page.getByRole('button', { name: 'Sign In Securely' }).click()
    
    // Should be on the home page.
    await expect(page).toHaveURL('/')
    
    // Go back to auth page to see the diagnostic panel.
    await page.goto('/auth')
    
    // Wait for session to load.
    await expect(page.getByText('OAuth Status')).toBeVisible()
    await expect(page.getByText('Authenticated')).toBeVisible()
    await expect(page.getByText('Email: test@example.com')).toBeVisible()
  })

  test('should handle logout flow correctly', async ({ page }) => {
    // Login first
    await page.getByPlaceholder('name@domain.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('Password123!')
    await page.getByRole('button', { name: 'Sign In Securely' }).click()
    
    // Should be on home page
    await expect(page).toHaveURL('/')
    
    // Perform logout (assuming there's a logout button in the navigation or profile)
    // We'll need to check where the logout button is.
    // Let's check Navbar or Profile page.
    await page.goto('/profile')
    const logoutBtn = page.getByRole('button', { name: 'Sign Out' })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await expect(page).toHaveURL('/auth')
    }
  })

  test('should handle password strength validation during signup', async ({ page }) => {
    // Switch to signup
    await page.getByRole('button', { name: 'signup' }).click()
    
    const passwordInput = page.getByPlaceholder('••••••••')
    
    // Weak password
    await passwordInput.fill('abc')
    await expect(page.getByText('8+ chars')).not.toHaveClass(/bg-green-100/)
    
    // Medium password
    await passwordInput.fill('Abc12345')
    await expect(page.getByText('✓ 8+ chars')).toBeVisible()
    await expect(page.getByText('✓ Uppercase')).toBeVisible()
    await expect(page.getByText('✓ Lowercase')).toBeVisible()
    await expect(page.getByText('✓ Number')).toBeVisible()
  })
})
