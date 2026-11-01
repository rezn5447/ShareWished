import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { NextRequest, NextResponse } from 'next/server'
import { parseProductHtml, type PageDetails } from '@/lib/link-preview/parse-html'
import { parseShopifyProduct, shopifyProductJsonUrl } from '@/lib/link-preview/shopify'
import { isValidUrl } from '@/utils/format'
import { previewFromUrl } from '@/utils/linkPreview'
import type { LinkPreview } from '@/types/wishlist'

export const runtime = 'nodejs'

// Identify honestly. Shops that block bots will block this — that's fine,
// the client falls back to reading the link itself.
const USER_AGENT = 'WishlistedLinkPreview/1.0 (+link preview for a wishlist app)'
const TIMEOUT_MS = 6000
const MAX_BYTES = 1_500_000
const MAX_REDIRECTS = 3

/**
 * GET /api/link-preview?url=<product link>
 * Signed-in only (see proxy.ts). Always responds 200 with the best preview it
 * can build; fields the page didn't provide fall back to the link-only guess.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')?.trim() ?? ''
  if (!isValidUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let page: FetchedPage | null = null
  try {
    page = await fetchPublic(url, 'text/html,application/xhtml+xml', /html/)
  } catch {
    /* blocked or timed out — fall back to the link-only preview */
  }
  // Short links (a.co/…) only reveal the shop and product slug after redirecting.
  const resolvedUrl = page?.url ?? url
  const found: PageDetails = page?.body
    ? parseProductHtml(page.body, page.url)
    : { title: '', image: '', price: 0 }

  if (!found.title || !found.image || !found.price) {
    const shopify = await fetchShopifyProduct(resolvedUrl).catch(() => null)
    if (shopify) {
      found.title ||= shopify.title
      found.image ||= shopify.image
      found.price ||= shopify.price
    }
  }

  const guess = previewFromUrl(resolvedUrl)
  const preview: LinkPreview = {
    title: found.title || guess.title,
    image: found.image || guess.image,
    price: found.price || guess.price,
    retailer: guess.retailer,
    source: found.title || found.image ? 'page' : 'link',
  }
  return NextResponse.json(preview)
}

async function fetchShopifyProduct(pageUrl: string): Promise<PageDetails | null> {
  const productUrl = shopifyProductJsonUrl(pageUrl)
  if (!productUrl) return null
  const json = 'application/json'
  const [product, shop] = await Promise.all([
    fetchPublic(productUrl, json, /json|javascript/),
    fetchPublic(new URL('/meta.json', productUrl).toString(), json, /json/).catch(() => null),
  ])
  if (!product.body) return null
  return parseShopifyProduct(product.body, shop?.body ?? null, pageUrl)
}

/** `body` is null when the server refused or sent the wrong content type. */
interface FetchedPage {
  url: string
  body: string | null
}

/** Fetches a public URL, following redirects only to other public hosts. */
async function fetchPublic(startUrl: string, accept: string, contentType: RegExp): Promise<FetchedPage> {
  let url = startUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url)
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return { url, body: null }
      const next = new URL(location, url).toString()
      if (!isValidUrl(next)) return { url, body: null }
      url = next
      continue
    }
    if (!response.ok || !contentType.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel().catch(() => {})
      return { url, body: null }
    }
    return { url, body: await readCapped(response) }
  }
  return { url, body: null }
}

/** Reads at most MAX_BYTES — product metadata lives near the top of the page. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
  }
  await reader.cancel().catch(() => {})
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES))
}

/**
 * Blocks requests to localhost, private networks and cloud metadata so this
 * route can't be used to probe our own infrastructure. (A host could still
 * change its DNS answer between this check and the fetch; acceptable for a
 * signed-in-only preview endpoint, but keep that in mind before reusing.)
 */
async function assertPublicHost(url: string) {
  const { hostname, port } = new URL(url)
  if (port && port !== '80' && port !== '443') throw new Error('Blocked port')
  const host = hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('Blocked address')
  }
}

// BlockList matches IPv4-mapped IPv6 (::ffff:7f00:1 and friends) against the
// IPv4 rules, so hex-form tricks can't slip past them.
const PRIVATE_RANGES = new BlockList()
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['100.64.0.0', 10],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 3], // multicast + reserved
] as const) {
  PRIVATE_RANGES.addSubnet(prefix, bits, 'ipv4')
}
for (const [prefix, bits] of [
  ['::', 96], // unspecified, loopback, IPv4-compatible (::7f00:1)
  ['64:ff9b::', 96], // NAT64 — embeds an IPv4 address
  ['64:ff9b:1::', 48], // local-use NAT64
  ['2002::', 16], // 6to4 — embeds an IPv4 address
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecated)
  ['ff00::', 8], // multicast
] as const) {
  PRIVATE_RANGES.addSubnet(prefix, bits, 'ipv6')
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true
  return PRIVATE_RANGES.check(address, family === 4 ? 'ipv4' : 'ipv6')
}
