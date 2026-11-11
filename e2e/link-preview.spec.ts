import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { test, expect } from './support/fixtures'

/**
 * The route fetches user-supplied URLs server-side, so it must not be usable
 * to read services on the server's own network (SSRF). A local page with a
 * secret title stands in for an internal service.
 */
test.describe('link preview API', () => {
  let server: Server
  let port: number
  test.beforeAll(async () => {
    server = createServer((_, res) => {
      res.setHeader('content-type', 'text/html')
      res.end('<html><head><title>INTERNAL-SECRET</title><meta property="og:title" content="INTERNAL-SECRET"></head></html>')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })
  test.afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  test('will not read pages on localhost or private networks', async ({ ownerPage: page }) => {
    // Loading a page first refreshes the short-lived Clerk session cookie.
    await page.goto('/lists')
    for (const target of [
      `http://127.0.0.1:${port}/`,
      `http://localhost:${port}/`,
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/',
    ]) {
      const response = await page.request.get(`/api/link-preview?url=${encodeURIComponent(target)}`)
      expect(response.status(), target).toBe(200)
      const body = await response.json()
      expect(body.title, target).not.toContain('INTERNAL-SECRET')
      // Fell back to a guess from the link itself; the page was never read.
      expect(body.source, target).toBe('link')
    }
  })

  // The baseline for the AI work: what the reader found, and what the person saved.
  test('logs each lookup and what was saved from it', async ({ ownerPage: page, ownerDb, lists }, testInfo) => {
    const list = await lists.create('Log', [])
    // A blocked local address, so the reader can only guess from the link: no network needed.
    // Unique per run, so a row left by a crashed run can't match.
    const link = `http://127.0.0.1:${port}/products/brass-reading-lamp?run=${testInfo.testId}-${Date.now()}`
    await page.goto(`/list/${list.id}`)
    await page.getByRole('button', { name: 'Add your first item' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add an item' })
    await sheet.getByLabel('Link').fill(link)
    await sheet.getByLabel('Link').blur()
    await expect(sheet.getByLabel('Item name')).toHaveValue('Brass Reading Lamp')
    await sheet.getByLabel('Item name').fill('Brass Lamp')
    await sheet.getByLabel('Price (USD)').fill('129')
    await sheet.getByRole('button', { name: 'Add to wishlist' }).click()
    await expect(sheet).toBeHidden()

    await expect
      .poll(async () => {
        const { data } = await ownerDb.from('link_previews').select('*').eq('url', link)
        return data
      })
      .toEqual([
        expect.objectContaining({
          source: 'link',
          title: 'Brass Reading Lamp',
          title_from: 'link',
          price_from: 'none',
          image_from: 'none',
          item_id: expect.any(String),
          filled_title: 'Brass Reading Lamp',
          saved_title: 'Brass Lamp',
          saved_price: 129,
        }),
      ])
  })

  test('rejects things that are not web links', async ({ ownerPage: page }) => {
    await page.goto('/lists')
    for (const target of ['file:///etc/passwd', 'not a url', 'javascript:alert(1)']) {
      const response = await page.request.get(`/api/link-preview?url=${encodeURIComponent(target)}`)
      expect(response.status(), target).toBe(400)
    }
  })
})
