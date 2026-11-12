import type { Page } from '@playwright/test'
import { test, expect, itemCard } from './support/fixtures'
import { anonDb, type Db } from './support/db'
import { env } from './support/env'
import { ownerId } from './support/users'

const BUCKET = 'item-images'

/** A phone-sized photo (2400x1600 JPEG), drawn in the browser so no fixture file is needed. */
async function phonePhoto(page: Page, color: string) {
  const base64 = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1600
    const context = canvas.getContext('2d')!
    context.fillStyle = fill
    context.fillRect(0, 0, 2400, 1600)
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
  }, color)
  return { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') }
}

/** Storage path of an uploaded photo, from its public URL. */
function storagePath(src: string) {
  return decodeURIComponent(new URL(src).pathname.split(`/object/public/${BUCKET}/`)[1])
}

// Owners adding their own photo when the shop's is missing or wrong.
test.describe('item photo', () => {
  // Paths uploaded during a test, removed afterwards whatever happened.
  let uploaded: string[] = []
  test.afterEach(async ({ ownerDb }) => {
    if (uploaded.length) await ownerDb.storage.from(BUCKET).remove(uploaded)
    uploaded = []
  })

  async function exists(ownerDb: Db, path: string) {
    const [folder, name] = path.split('/')
    const { data, error } = await ownerDb.storage.from(BUCKET).list(folder, { search: name })
    if (error) throw error
    return data.some((file) => file.name === name)
  }

  test('adds an item with a photo, shrunk, then replaces and removes it', async ({
    ownerPage: page,
    lists,
    ownerDb,
  }) => {
    const list = await lists.create('Photo', [])
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Add your first item' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add an item' })
    await sheet.getByLabel('Link').fill('https://shop.example.com/products/e2e-mug')
    await sheet.getByLabel('Item name').fill('Speckled Mug')
    await sheet.getByLabel('Add a photo').setInputFiles(await phonePhoto(page, '#c0392b'))
    await expect(sheet.getByRole('button', { name: "Don't use this photo" })).toBeVisible()
    await sheet.getByRole('button', { name: 'Add to wishlist' }).click()
    await expect(sheet).toBeHidden()

    const photo = itemCard(page, 'Speckled Mug').getByRole('img', { name: 'Speckled Mug' })
    const prefix = `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${ownerId()}/`
    await expect(photo).toHaveAttribute('src', new RegExp(`^${prefix.replace(/[.?]/g, '\\$&')}`))
    const first = storagePath((await photo.getAttribute('src'))!)
    uploaded.push(first)
    // Loads for real, and was shrunk from 2400px to 500px on the long edge.
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(500)
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(333)

    // Gifters see it without signing in.
    const res = await page.request.get((await photo.getAttribute('src'))!)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe('image/jpeg')
    expect((await res.body()).length).toBeLessThan(200_000)

    // Editing other details keeps the photo, even when the link changes.
    await itemCard(page, 'Speckled Mug').getByRole('button', { name: 'Edit Speckled Mug' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit item' })
    await edit.getByLabel('Link').fill('https://shop.example.com/products/e2e-mug-blue')
    await edit.getByLabel('Item name').fill('Speckled Mug, blue')
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(edit).toBeHidden()
    const renamed = itemCard(page, 'Speckled Mug, blue').getByRole('img', { name: 'Speckled Mug, blue' })
    expect(storagePath((await renamed.getAttribute('src'))!)).toBe(first)

    // Replacing the photo deletes the old file.
    await itemCard(page, 'Speckled Mug, blue').getByRole('button', { name: 'Edit Speckled Mug, blue' }).click()
    await edit.getByLabel('Change photo').setInputFiles(await phonePhoto(page, '#2e86c1'))
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(edit).toBeHidden()
    await expect(renamed).not.toHaveAttribute('src', new RegExp(first))
    const second = storagePath((await renamed.getAttribute('src'))!)
    uploaded.push(second)
    expect(await exists(ownerDb, second)).toBe(true)
    expect(await exists(ownerDb, first)).toBe(false)

    // Removing the item deletes its photo.
    await itemCard(page, 'Speckled Mug, blue').getByRole('button', { name: 'Remove Speckled Mug, blue' }).click()
    await expect(itemCard(page, 'Speckled Mug, blue')).toHaveCount(0)
    await expect.poll(() => exists(ownerDb, second)).toBe(false)
  })

  test('deleting a list deletes its item photos', async ({ ownerPage: page, lists, ownerDb }) => {
    const list = await lists.create('Photo list', [{ title: 'Kite' }])
    await page.goto(`/list/${list.id}`)
    await itemCard(page, 'Kite').getByRole('button', { name: 'Edit Kite' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit item' })
    await edit.getByLabel('Add a photo').setInputFiles(await phonePhoto(page, '#27ae60'))
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(edit).toBeHidden()
    const path = storagePath((await itemCard(page, 'Kite').getByRole('img').getAttribute('src'))!)
    uploaded.push(path)

    await page.getByRole('button', { name: 'Edit list details' }).click()
    const sheet = page.getByRole('dialog', { name: 'Edit list' })
    await sheet.getByRole('button', { name: 'Delete list' }).click()
    await sheet.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(page).toHaveURL(/\/lists$/)
    await expect.poll(() => exists(ownerDb, path)).toBe(false)
  })

  test('a file that is not a photo says so and saves nothing', async ({ ownerPage: page, lists }) => {
    const list = await lists.create('Not photo', [{ title: 'Scarf' }])
    await page.goto(`/list/${list.id}`)
    await itemCard(page, 'Scarf').getByRole('button', { name: 'Edit Scarf' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit item' })
    await edit
      .getByLabel('Add a photo')
      .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(edit.getByRole('alert')).toHaveText("That file isn't a photo.")
  })

  // The bucket rules, checked directly: they hold even if the browser code is bypassed.
  test('storage only takes small photos, in your own folder, from signed-in owners', async ({ ownerDb }) => {
    const jpeg = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
    const mine = `${ownerId()}/e2e-${Date.now()}.jpg`

    const ok = await ownerDb.storage.from(BUCKET).upload(mine, jpeg(1000), { contentType: 'image/jpeg' })
    expect(ok.error).toBeNull()
    uploaded.push(mine)

    const tooBig = await ownerDb.storage
      .from(BUCKET)
      .upload(`${ownerId()}/e2e-big-${Date.now()}.jpg`, jpeg(1_100_000), { contentType: 'image/jpeg' })
    expect(tooBig.error).not.toBeNull()

    const wrongType = await ownerDb.storage
      .from(BUCKET)
      .upload(`${ownerId()}/e2e-${Date.now()}.txt`, new Blob(['x']), { contentType: 'text/plain' })
    expect(wrongType.error).not.toBeNull()

    const otherFolder = await ownerDb.storage
      .from(BUCKET)
      .upload(`user_someone_else/e2e-${Date.now()}.jpg`, jpeg(1000), { contentType: 'image/jpeg' })
    expect(otherFolder.error).not.toBeNull()

    const overwrite = await ownerDb.storage.from(BUCKET).upload(mine, jpeg(1000), { contentType: 'image/jpeg', upsert: true })
    expect(overwrite.error).not.toBeNull()

    const anon = await anonDb()
      .storage.from(BUCKET)
      .upload(`${ownerId()}/e2e-anon-${Date.now()}.jpg`, jpeg(1000), { contentType: 'image/jpeg' })
    expect(anon.error).not.toBeNull()
    // Anonymous visitors can't delete or list either.
    await anonDb().storage.from(BUCKET).remove([mine])
    expect(await exists(ownerDb, mine)).toBe(true)
    const { data: listed } = await anonDb().storage.from(BUCKET).list(ownerId())
    expect(listed ?? []).toHaveLength(0)
  })
})
