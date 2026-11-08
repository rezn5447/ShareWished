import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'
import { OWNER } from './support/users'

// The real sign-in form, the way a person uses it: email, then the emailed code.
// `+clerk_test` addresses on a Clerk dev instance accept 424242 without sending mail.
test('sign in with an email code, then sign out', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/lists')
  await expect(page).toHaveURL(/\/sign-in/)

  await page.getByLabel('Email address').fill(OWNER.email)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  // The resend countdown starts once the code is sent; typing earlier is rejected.
  await expect(page.getByRole('button', { name: /Resend/ })).toBeVisible()
  await page.getByRole('textbox', { name: 'Enter verification code' }).click()
  await page.keyboard.type('424242')

  await expect(page).toHaveURL(/\/lists$/)
  await expect(page.getByRole('heading', { name: `Hi, ${OWNER.firstName}` })).toBeVisible()

  await page.getByRole('link', { name: 'You' }).click()
  await expect(page.getByText(OWNER.email)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  await page.goto('/lists')
  await expect(page).toHaveURL(/\/sign-in/)
})
