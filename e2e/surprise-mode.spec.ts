import { test, expect, itemCard } from './support/fixtures'
import { anonDb } from './support/db'
import { OWNER } from './support/users'

/**
 * The invariant that must not break: friends see what's claimed so nobody
 * doubles up, and the owner never learns what's claimed or by whom.
 */
test.describe('surprise mode', () => {
  test('a friend claims a gift; other friends see it, the owner never does', async ({
    lists,
    newVisitor,
    ownerPage,
  }) => {
    const list = await lists.create('Claims', [{ title: 'Ceramic Teapot' }, { title: 'Wool Scarf' }])

    // Friend 1 claims the teapot.
    const friend = await newVisitor()
    await friend.goto(`/w/${list.shareId}`)
    await expect(friend.getByRole('heading', { name: `${OWNER.firstName}'s ${list.title}` })).toBeVisible()
    await expect(friend.getByRole('button', { name: 'Still available (2)' })).toBeVisible()
    await itemCard(friend, 'Ceramic Teapot').getByRole('button', { name: 'I bought this' }).click()
    const sheet = friend.getByRole('dialog', { name: 'Mark as bought' })
    await expect(sheet).toContainText(`${OWNER.firstName} will never see that this was bought`)
    await sheet.getByLabel('Who should we show this as?').fill('Gus Gifter')
    await sheet.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(friend.getByRole('status')).toHaveText(`Locked in. ${OWNER.firstName} won't see a thing.`)

    // Claimed items drop out of "Still available" and show as yours under "All".
    await expect(friend.getByRole('button', { name: 'Still available (1)' })).toBeVisible()
    await expect(itemCard(friend, 'Ceramic Teapot')).toHaveCount(0)
    await friend.getByRole('button', { name: 'All (2)' }).click()
    await expect(itemCard(friend, 'Ceramic Teapot')).toContainText("You're covering this")

    // Friend 2, in another browser, sees who's covering it and can't undo it.
    const other = await newVisitor()
    await other.goto(`/w/${list.shareId}`)
    await other.getByRole('button', { name: 'All (2)' }).click()
    const teapot = itemCard(other, 'Ceramic Teapot')
    await expect(teapot).toContainText('Covered by Gus Gifter')
    await expect(teapot.getByRole('button', { name: 'Undo' })).toHaveCount(0)
    await expect(teapot.getByRole('button', { name: 'I bought this' })).toHaveCount(0)

    // The owner, on the same share link: everything looks unclaimed.
    await ownerPage.goto(`/w/${list.shareId}`)
    await expect(ownerPage.getByRole('button', { name: 'Still available (2)' })).toBeVisible()
    await expect(itemCard(ownerPage, 'Ceramic Teapot').getByRole('button', { name: 'I bought this' })).toBeVisible()
    await expect(ownerPage.getByText(/Covered by|covering this/)).toHaveCount(0)
    await expect(ownerPage.getByText('Gus Gifter')).toHaveCount(0)

    // ...and on their own list page.
    await ownerPage.goto(`/list/${list.id}`)
    await expect(itemCard(ownerPage, 'Ceramic Teapot')).toBeVisible()
    await expect(ownerPage.locator('body')).not.toContainText('Gus Gifter')

    // The raw page HTML doesn't carry it either (server metadata, OG tags).
    const html = await (await ownerPage.request.get(`/w/${list.shareId}`)).text()
    expect(html).not.toContain('Gus Gifter')
  })

  test('the owner cannot claim their own gifts', async ({ lists, ownerPage }) => {
    const list = await lists.create('Own claim', [{ title: 'Board Game' }])
    await ownerPage.goto(`/w/${list.shareId}`)
    await itemCard(ownerPage, 'Board Game').getByRole('button', { name: 'I bought this' }).click()
    const sheet = ownerPage.getByRole('dialog', { name: 'Mark as bought' })
    await sheet.getByLabel('Who should we show this as?').fill('Sneaky Owner')
    await sheet.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(ownerPage.getByRole('status')).toHaveText(
      'This is your own list — gifts are claimed by your visitors.',
    )
    await expect(ownerPage.getByRole('button', { name: 'Still available (1)' })).toBeVisible()
  })

  test('two friends racing for the same gift: the second is told it is taken', async ({
    lists,
    newVisitor,
  }) => {
    const list = await lists.create('Race', [{ title: 'Espresso Grinder' }, { title: 'Tea Towels' }])
    const first = await newVisitor()
    const second = await newVisitor()
    await first.goto(`/w/${list.shareId}`)
    await second.goto(`/w/${list.shareId}`)
    await expect(itemCard(second, 'Espresso Grinder')).toBeVisible()

    await itemCard(first, 'Espresso Grinder').getByRole('button', { name: 'I bought this' }).click()
    await first.getByLabel('Who should we show this as?').fill('First Friend')
    await first.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(first.getByRole('status')).toContainText('Locked in.')

    // Second friend's page is stale and still offers the grinder.
    await itemCard(second, 'Espresso Grinder').getByRole('button', { name: 'I bought this' }).click()
    await second.getByLabel('Who should we show this as?').fill('Second Friend')
    await second.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(second.getByRole('status')).toHaveText('Someone just claimed this one. Pick another gift?')
    await second.getByRole('button', { name: 'All (2)' }).click()
    await expect(itemCard(second, 'Espresso Grinder')).toContainText('Covered by First Friend')
  })

  test('a friend can undo their claim, and their name is remembered', async ({ lists, newVisitor }) => {
    const list = await lists.create('Undo', [{ title: 'Plant Stand' }, { title: 'Picture Frame' }])
    const friend = await newVisitor()
    await friend.goto(`/w/${list.shareId}`)

    await itemCard(friend, 'Plant Stand').getByRole('button', { name: 'I bought this' }).click()
    await friend.getByLabel('Who should we show this as?').fill('Uma Undo')
    await friend.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(friend.getByRole('button', { name: 'Still available (1)' })).toBeVisible()

    // Survives a reload: the claim token lives in localStorage.
    await friend.reload()
    await friend.getByRole('button', { name: 'All (2)' }).click()
    await itemCard(friend, 'Plant Stand').getByRole('button', { name: 'Undo' }).click()
    await expect(itemCard(friend, 'Plant Stand').getByRole('button', { name: 'I bought this' })).toBeVisible()
    await expect(friend.getByRole('button', { name: 'Still available (2)' })).toBeVisible()

    // A second claim prefills the name used last time.
    await itemCard(friend, 'Picture Frame').getByRole('button', { name: 'I bought this' }).click()
    await expect(friend.getByLabel('Who should we show this as?')).toHaveValue('Uma Undo')
  })

  test('when everything is claimed, friends are told it is all covered', async ({ lists, newVisitor }) => {
    const list = await lists.create('Covered', [{ title: 'Bike Bell' }])
    const friend = await newVisitor()
    await friend.goto(`/w/${list.shareId}`)
    await itemCard(friend, 'Bike Bell').getByRole('button', { name: 'I bought this' }).click()
    await friend.getByLabel('Who should we show this as?').fill('Cal Covered')
    await friend.getByRole('button', { name: 'Yes, I bought it' }).click()
    await expect(friend.getByRole('heading', { name: "Everything's covered" })).toBeVisible()
    await expect(friend.getByRole('button', { name: 'Still available (0)' })).toBeVisible()
  })
})

/**
 * The same rules checked at the database, where they're actually enforced.
 * The UI tests above would still pass if the browser merely hid purchases.
 */
test.describe('surprise mode in the database', () => {
  test('get_shared_list strips purchases for the owner only', async ({ lists, ownerDb }) => {
    const list = await lists.create('RPC', [{ title: 'Claimed' }, { title: 'Open' }])
    const anon = anonDb()
    const { error: claimError } = await anon.rpc('claim_item', {
      p_item_id: list.items[0].id,
      p_gifter_name: 'Db Friend',
    })
    expect(claimError).toBeNull()

    type Payload = { is_owner: boolean; items: Array<{ title: string; purchase: unknown }> }
    const asFriend = (await anon.rpc('get_shared_list', { p_share_id: list.shareId })).data as unknown as Payload
    expect(asFriend.is_owner).toBe(false)
    expect(asFriend.items.find((i) => i.title === 'Claimed')?.purchase).toMatchObject({ gifter_name: 'Db Friend' })
    // Friends never get another friend's undo token.
    expect(JSON.stringify(asFriend)).not.toMatch(/claim_token/)

    const asOwner = (await ownerDb.rpc('get_shared_list', { p_share_id: list.shareId })).data as unknown as Payload
    expect(asOwner.is_owner).toBe(true)
    expect(asOwner.items.map((i) => i.purchase)).toEqual([null, null])
    expect(JSON.stringify(asOwner)).not.toContain('Db Friend')
  })

  test('nobody can read the purchases table directly', async ({ lists, ownerDb }) => {
    const list = await lists.create('Table', [{ title: 'Claimed' }])
    await anonDb().rpc('claim_item', { p_item_id: list.items[0].id, p_gifter_name: 'Table Friend' })

    for (const [who, db] of [['owner', ownerDb], ['anon', anonDb()]] as const) {
      const { data, error } = await db.from('purchases').select('*')
      // No grants: either a permission error or nothing visible.
      expect(error !== null || data?.length === 0, `${who} read purchases`).toBe(true)
    }
  })

  test('anonymous visitors cannot list wishlists or items', async ({ lists }) => {
    await lists.create('Hidden', [{ title: 'Secret item' }])
    const anon = anonDb()
    for (const table of ['wishlists', 'wishlist_items'] as const) {
      const { data, error } = await anon.from(table).select('*').limit(1)
      expect(error !== null || data?.length === 0, `anon read ${table}`).toBe(true)
    }
  })

  test("anonymous visitors can't delete or add items", async ({ lists, ownerDb }) => {
    const list = await lists.create('Tamper', [{ title: 'Keep me' }])
    const anon = anonDb()
    await anon.from('wishlist_items').delete().eq('wishlist_id', list.id)
    const { error: insertError } = await anon.from('wishlist_items').insert({
      wishlist_id: list.id,
      title: 'Planted',
      url: 'https://example.com',
      retailer: 'Example',
      image: '',
      price: 1,
      priority: 'normal',
    })
    expect(insertError).not.toBeNull()
    const { data: items } = await ownerDb.from('wishlist_items').select('title').eq('wishlist_id', list.id)
    expect(items).toEqual([{ title: 'Keep me' }])
  })

  test('undoing a claim needs the claim token', async ({ lists }) => {
    const list = await lists.create('Token', [{ title: 'Claimed' }])
    const anon = anonDb()
    const { data: token } = await anon.rpc('claim_item', { p_item_id: list.items[0].id, p_gifter_name: 'Token Friend' })
    expect(token).toBeTruthy()

    await anon.rpc('unclaim_item', {
      p_item_id: list.items[0].id,
      p_claim_token: '00000000-0000-0000-0000-000000000000',
    })
    const after = (await anon.rpc('get_shared_list', { p_share_id: list.shareId })).data as unknown as {
      items: Array<{ purchase: unknown }>
    }
    expect(after.items[0].purchase).not.toBeNull()

    const { error } = await anon.rpc('unclaim_item', { p_item_id: list.items[0].id, p_claim_token: token! })
    expect(error).toBeNull()
    const cleared = (await anon.rpc('get_shared_list', { p_share_id: list.shareId })).data as unknown as {
      items: Array<{ purchase: unknown }>
    }
    expect(cleared.items[0].purchase).toBeNull()
  })
})
