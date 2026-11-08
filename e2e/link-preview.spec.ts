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

  test('rejects things that are not web links', async ({ ownerPage: page }) => {
    await page.goto('/lists')
    for (const target of ['file:///etc/passwd', 'not a url', 'javascript:alert(1)']) {
      const response = await page.request.get(`/api/link-preview?url=${encodeURIComponent(target)}`)
      expect(response.status(), target).toBe(400)
    }
  })
})
