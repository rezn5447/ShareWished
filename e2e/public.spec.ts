import { test, expect } from '@playwright/test'

// Signed-out visitors: what anyone can reach without an account.
test.describe('signed out', () => {
  test('landing page offers sign up and sign in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Ask for what you\s*actually want/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create your wishlist' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  for (const path of ['/lists', '/create', '/profile', '/list/00000000-0000-0000-0000-000000000000']) {
    test(`${path} sends you to sign in`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/sign-in/)
    })
  }

  test('link previews are not available without signing in', async ({ request }) => {
    const response = await request.get('/api/link-preview?url=https://example.com', { maxRedirects: 0 })
    expect(response.status()).not.toBe(200)
  })

  test('a broken share link explains itself', async ({ page }) => {
    await page.goto('/w/this-list-does-not-exist-e2e')
    await expect(page.getByRole('heading', { name: "This link isn't working" })).toBeVisible()
  })
})
