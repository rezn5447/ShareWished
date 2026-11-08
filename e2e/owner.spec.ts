import { test, expect, itemCard } from './support/fixtures'
import { OWNER } from './support/users'

// An owner building and sharing a list.
test.describe('owner', () => {
  test('creates a list, adds an item and removes it', async ({ ownerPage: page, lists }, testInfo) => {
    const title = `E2E ${testInfo.testId.slice(0, 6)} Birthday`
    await page.goto('/create')
    await page.getByLabel('List name').fill(title)
    await page.getByRole('button', { name: /Wedding/ }).click()
    await page.getByLabel('A note for visitors').fill('Just ideas!')
    await page.getByRole('button', { name: 'Create list' }).click()

    await expect(page).toHaveURL(/\/list\/[0-9a-f-]{36}$/)
    lists.track(page.url().split('/').pop()!)
    await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible()
    await expect(page.getByText('Wedding', { exact: true })).toBeVisible()
    await expect(page.getByText('Just ideas!')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible()

    await page.getByRole('button', { name: 'Add your first item' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add an item' })
    await sheet.getByLabel('Link').fill('https://shop.example.com/products/e2e-lamp')
    await sheet.getByLabel('Item name').fill('Brass Reading Lamp')
    await sheet.getByLabel('Price (USD)').fill('129')
    await sheet.getByLabel('Note for gifters').fill('Warm white bulb')
    await sheet.getByRole('button', { name: 'Top pick' }).click()
    await sheet.getByRole('button', { name: 'Add to wishlist' }).click()

    await expect(sheet).toBeHidden()
    const card = itemCard(page, 'Brass Reading Lamp')
    await expect(card).toContainText('$129')
    await expect(card).toContainText('Top pick')
    await expect(card).toContainText('"Warm white bulb"')

    await page.goto('/lists')
    await expect(page.getByRole('link', { name: new RegExp(`${title}.*1 item`) })).toBeVisible()
    await page.getByRole('link', { name: new RegExp(title) }).click()

    await itemCard(page, 'Brass Reading Lamp').getByRole('button', { name: 'Remove Brass Reading Lamp' }).click()
    await expect(itemCard(page, 'Brass Reading Lamp')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible()
  })

  // Regression: on a slow connection, "Create list" clicked before Clerk had
  // loaded the user used to do nothing at all.
  test('creating a list works while sign-in is still loading', async ({ ownerPage: page, lists }) => {
    await page.route(/clerk\.accounts\.dev/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      await route.fallback()
    })
    await page.goto('/create')
    await page.getByLabel('List name').fill('E2E slow sign-in')
    await page.getByRole('button', { name: 'Create list' }).click()
    await expect(page).toHaveURL(/\/list\/[0-9a-f-]{36}$/, { timeout: 30_000 })
    lists.track(page.url().split('/').pop()!)
    await expect(page.getByRole('heading', { name: 'E2E slow sign-in', level: 2 })).toBeVisible()
  })

  test('says so when a list could not be created', async ({ ownerPage: page }) => {
    await page.route('**/rest/v1/wishlists**', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, json: { message: 'boom' } })
        : route.fallback(),
    )
    await page.goto('/create')
    await page.getByLabel('List name').fill('E2E will fail')
    await page.getByRole('button', { name: 'Create list' }).click()
    await expect(page.getByRole('alert').filter({ hasText: "Couldn't create the list" })).toBeVisible()
    await expect(page).toHaveURL(/\/create$/)
  })

  test('pasting a link fills in the details from the page', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Preview', [])
    // Stub the server lookup: this test is about the form, not about scraping a real shop.
    await page.route('**/api/link-preview?**', (route) =>
      route.fulfill({
        json: {
          title: 'Linen Duvet Cover, Queen',
          image: '/item-placeholder.svg',
          price: 210,
          retailer: 'Parachute',
          source: 'page',
        },
      }),
    )
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Add item' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add an item' })
    await sheet.getByLabel('Link').fill('Look at this https://www.parachutehome.com/products/linen-duvet')
    await sheet.getByLabel('Link').blur()

    await expect(sheet.getByLabel('Item name')).toHaveValue('Linen Duvet Cover, Queen')
    await expect(sheet.getByLabel('Price (USD)')).toHaveValue('210')
    // Shared text is trimmed down to the bare link.
    await expect(sheet.getByLabel('Link')).toHaveValue('https://www.parachutehome.com/products/linen-duvet')
    await sheet.getByRole('button', { name: 'Add to wishlist' }).click()

    const card = itemCard(page, 'Linen Duvet Cover, Queen')
    await expect(card).toContainText('$210')
    await expect(card).toContainText('Parachute')
  })

  test('rejects an item without a real link', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Validation', [])
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Add item' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add an item' })
    await sheet.getByLabel('Link').fill('just some words')
    await sheet.getByLabel('Item name').fill('Mystery')
    await sheet.getByRole('button', { name: 'Add to wishlist' }).click()
    await expect(sheet.getByRole('alert')).toHaveText("That doesn't look like a link. Paste the full web address.")
    await expect(sheet).toBeVisible()
  })

  test('share sheet shows the link visitors use', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Share', [{ title: 'Candle' }])
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Share list' }).last().click()
    const sheet = page.getByRole('dialog', { name: 'Share your list' })
    await expect(sheet).toContainText(`/w/${list.shareId}`)
    await sheet.getByRole('link', { name: 'Peek at what visitors see' }).click()
    await expect(page).toHaveURL(new RegExp(`/w/${list.shareId}$`))
    await expect(page.getByRole('heading', { name: `${OWNER.firstName}'s ${list.title}` })).toBeVisible()
  })

  test("someone else's list id shows not found", async ({ ownerPage: page }) => {
    await page.goto('/list/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: 'List not found' })).toBeVisible()
  })
})
