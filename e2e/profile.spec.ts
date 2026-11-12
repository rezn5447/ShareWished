import { test, expect } from './support/fixtures'

// Same value the build inlines: playwright.config loads .env.local too.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

test.describe('profile', () => {
  test('every row goes somewhere', async ({ ownerPage: page }) => {
    await page.goto('/profile')
    // Notifications were never built, so the row is gone rather than dead.
    await expect(page.getByText('Notifications')).toHaveCount(0)

    const help = page.getByRole('link', { name: /Help & feedback/ })
    if (SUPPORT_EMAIL) {
      await expect(help).toHaveAttribute('href', new RegExp(`^mailto:${SUPPORT_EMAIL.replace(/[.+]/g, '\\$&')}\\?`))
    } else {
      await expect(help).toHaveCount(0)
    }

    await page.getByRole('link', { name: /Privacy/ }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { name: 'Surprise mode is always on' })).toBeVisible()
    await page.getByRole('button', { name: 'Go back' }).click()
    await expect(page).toHaveURL(/\/profile$/)
  })

  test('shows initials when the account has no photo', async ({ ownerPage: page }) => {
    // The e2e owner signs in by email, so Clerk has no photo for them.
    await page.goto('/profile')
    await expect(page.getByTestId('profile-initials')).toBeVisible()
    await expect(page.getByTestId('profile-photo')).toHaveCount(0)
  })

  test('the privacy page is readable without signing in', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { name: 'Who can open your lists' })).toBeVisible()
  })
})
