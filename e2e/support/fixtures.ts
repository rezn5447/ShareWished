import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base, devices, expect, type Page } from '@playwright/test'
import { deleteLists, insertList, userDb, type Db, type SeedItem, type SeededList } from './db'
import { OWNER_STATE, ownerId } from './users'

// Same phone as the mobile-chrome project, for contexts the fixtures open themselves.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7']
const phone = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch }

interface Fixtures {
  /** A page signed in as the e2e owner. */
  ownerPage: Page
  /** Opens a fresh, signed-out browser: a friend who got the share link. */
  newVisitor: () => Promise<Page>
  /** Lists created during the test; all deleted afterwards. */
  lists: {
    create: (title: string, items: SeedItem[]) => Promise<SeededList>
    track: (id: string) => void
  }
}
interface WorkerFixtures {
  ownerDb: Db
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  ownerDb: [
    async ({}, use) => {
      const { db, close } = await userDb(ownerId())
      await use(db)
      await close()
    },
    { scope: 'worker' },
  ],

  lists: async ({ ownerDb }, use, testInfo) => {
    const ids: string[] = []
    // Unique per test so parallel tests never see each other's lists.
    const tag = `E2E ${testInfo.testId.slice(0, 6)}`
    await use({
      create: async (title, items) => {
        const list = await insertList(ownerDb, ownerId(), `${tag} ${title}`, items)
        ids.push(list.id)
        return list
      },
      track: (id) => ids.push(id),
    })
    await deleteLists(ownerDb, ids)
  },

  ownerPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ ...phone, baseURL, storageState: OWNER_STATE })
    await setupClerkTestingToken({ context })
    await use(await context.newPage())
    await context.close()
  },

  newVisitor: async ({ browser, baseURL }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = []
    await use(async () => {
      const context = await browser.newContext({ ...phone, baseURL })
      contexts.push(context)
      return context.newPage()
    })
    await Promise.all(contexts.map((context) => context.close()))
  },
})

export { expect }

/** An item card on a list, found by its title. */
export function itemCard(page: Page, title: string) {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}
