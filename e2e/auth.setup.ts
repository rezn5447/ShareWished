import { clerk } from '@clerk/testing/playwright'
import { expect, test as setup } from '@playwright/test'
import { OWNER, OWNER_STATE } from './support/users'

// Sign in once and reuse the browser state in every owner test.
setup('sign in as the e2e owner', async ({ page }) => {
  await page.goto('/')
  await clerk.signIn({ page, emailAddress: OWNER.email })
  await page.goto('/lists')
  await expect(page.getByRole('heading', { name: `Hi, ${OWNER.firstName}` })).toBeVisible()
  await page.context().storageState({ path: OWNER_STATE })
})
