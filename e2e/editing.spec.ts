import { test, expect, itemCard } from './support/fixtures'
import { OWNER } from './support/users'

// Owners fixing what they already made, without deleting and starting over.
test.describe('editing', () => {
  test('fixes a typo in an item price, name and note', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Edit item', [{ title: 'Brass Lmap', price: 1299, priority: 'normal' }])
    await page.goto(`/list/${list.id}`)
    await itemCard(page, 'Brass Lmap').getByRole('button', { name: 'Edit Brass Lmap' }).click()

    const sheet = page.getByRole('dialog', { name: 'Edit item' })
    // Opens with what was saved.
    await expect(sheet.getByLabel('Item name')).toHaveValue('Brass Lmap')
    await expect(sheet.getByLabel('Price (USD)')).toHaveValue('1299')
    await expect(sheet.getByLabel('Link')).toHaveValue('https://example.com/e2e/0')

    await sheet.getByLabel('Item name').fill('Brass Lamp')
    // Cents must be accepted, or a scraped $129.99 could never be re-saved.
    await sheet.getByLabel('Price (USD)').fill('129.99')
    await sheet.getByLabel('Note for gifters').fill('Warm white bulb')
    await sheet.getByRole('button', { name: 'Top pick' }).click()
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet).toBeHidden()

    const card = itemCard(page, 'Brass Lamp')
    await expect(card).toContainText('$129.99')
    await expect(card).toContainText('Top pick')
    await expect(card).toContainText('"Warm white bulb"')
    // Shop name and picture are kept when the link didn't change.
    await expect(card).toContainText('Example')

    await page.reload()
    await expect(itemCard(page, 'Brass Lamp')).toContainText('$129.99')
    await expect(itemCard(page, 'Brass Lmap')).toHaveCount(0)
  })

  test('clearing a note and price saves them as empty', async ({ ownerPage: page, lists, ownerDb }) => {
    const list = await lists.create('Clear', [{ title: 'Candle', price: 30 }])
    await ownerDb.from('wishlist_items').update({ note: 'Unscented' }).eq('id', list.items[0].id)
    await page.goto(`/list/${list.id}`)
    await expect(itemCard(page, 'Candle')).toContainText('"Unscented"')

    await itemCard(page, 'Candle').getByRole('button', { name: 'Edit Candle' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit item' })
    await sheet.getByLabel('Note for gifters').fill('')
    await sheet.getByLabel('Price (USD)').fill('')
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet).toBeHidden()

    await page.reload()
    await expect(itemCard(page, 'Candle')).toContainText('Price varies')
    await expect(itemCard(page, 'Candle')).not.toContainText('Unscented')
  })

  test('a failed save says so and keeps the edits', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Fail', [{ title: 'Teapot' }])
    await page.goto(`/list/${list.id}`)
    await page.route('**/rest/v1/wishlist_items**', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 500, json: { message: 'boom' } })
        : route.fallback(),
    )
    await itemCard(page, 'Teapot').getByRole('button', { name: 'Edit Teapot' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit item' })
    await sheet.getByLabel('Item name').fill('Teapot, blue')
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet.getByRole('alert')).toHaveText("Couldn't save that. Try again in a moment.")
    await expect(sheet.getByLabel('Item name')).toHaveValue('Teapot, blue')
  })

  test('edits the list title, occasion, date and note', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Brithday', [{ title: 'Kite' }])
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Edit list details' }).click()

    const sheet = page.getByRole('dialog', { name: 'Edit list' })
    await expect(sheet.getByLabel('List name')).toHaveValue(list.title)
    await expect(sheet.getByRole('button', { name: /Birthday/ })).toHaveAttribute('aria-pressed', 'true')

    const fixed = list.title.replace('Brithday', 'Housewarming')
    await sheet.getByLabel('List name').fill(fixed)
    await sheet.getByRole('button', { name: /Housewarming/ }).click()
    await sheet.getByLabel('Date').fill('2031-03-14')
    await sheet.getByLabel('A note for visitors').fill('Plants welcome')
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet).toBeHidden()

    await expect(page.getByRole('heading', { name: fixed, level: 2 })).toBeVisible()
    await expect(page.getByText('Housewarming · March 14')).toBeVisible()
    await expect(page.getByText('Plants welcome')).toBeVisible()

    // Same share link, now showing the fix to friends.
    await page.goto(`/w/${list.shareId}`)
    await expect(page.getByRole('heading', { name: `${OWNER.firstName}'s ${fixed}` })).toBeVisible()
    await expect(page.getByText('Plants welcome')).toBeVisible()
  })

  test('clears a list date', async ({ ownerPage: page, lists, ownerDb }) => {
    const list = await lists.create('Dated', [])
    await ownerDb.from('wishlists').update({ event_date: '2031-06-01' }).eq('id', list.id)
    await page.goto(`/list/${list.id}`)
    await expect(page.getByText(/June 1/)).toBeVisible()

    await page.getByRole('button', { name: 'Edit list details' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit list' })
    await sheet.getByLabel('Date').fill('')
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { name: list.title, level: 2 })).toBeVisible()
    await expect(page.getByText(/June 1/)).toHaveCount(0)
  })

  test('deletes a list after confirming', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Delete me', [{ title: 'Mug' }])
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Edit list details' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit list' })

    await sheet.getByRole('button', { name: 'Delete list' }).click()
    await expect(sheet).toContainText('the share link stops working')
    await sheet.getByRole('button', { name: 'Keep it' }).click()
    await sheet.getByRole('button', { name: 'Delete list' }).click()
    await sheet.getByRole('button', { name: 'Yes, delete' }).click()

    await expect(page).toHaveURL(/\/lists$/)
    await expect(page.getByRole('link', { name: new RegExp(list.title) })).toHaveCount(0)
    await page.goto(`/w/${list.shareId}`)
    await expect(page.getByRole('heading', { name: "This link isn't working" })).toBeVisible()
  })

  // Editing must not become a side door into surprise mode.
  test('editing a claimed item keeps the claim, and the owner still sees nothing', async ({
    lists,
    newVisitor,
    ownerPage,
  }) => {
    const list = await lists.create('Claimed edit', [{ title: 'Wool Scarf', price: 4 }])
    const friend = await newVisitor()
    await friend.goto(`/w/${list.shareId}`)
    await itemCard(friend, 'Wool Scarf').getByRole('button', { name: 'I bought this' }).click()
    await friend.getByLabel('Who should we show this as?').fill('Edie Editor')
    await friend.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(friend.getByRole('status')).toContainText('Locked in.')

    await ownerPage.goto(`/list/${list.id}`)
    await itemCard(ownerPage, 'Wool Scarf').getByRole('button', { name: 'Edit Wool Scarf' }).click()
    const sheet = ownerPage.getByRole('dialog', { name: 'Edit item' })
    await expect(sheet).not.toContainText('Edie Editor')
    await sheet.getByLabel('Price (USD)').fill('40')
    await sheet.getByRole('button', { name: 'Save changes' }).click()
    await expect(sheet).toBeHidden()
    await expect(itemCard(ownerPage, 'Wool Scarf')).toContainText('$40')
    await expect(ownerPage.locator('body')).not.toContainText('Edie Editor')

    await friend.reload()
    await friend.getByRole('button', { name: 'All (1)' }).click()
    await expect(itemCard(friend, 'Wool Scarf')).toContainText("You're covering this")
    await expect(itemCard(friend, 'Wool Scarf')).toContainText('$40')
  })
})
