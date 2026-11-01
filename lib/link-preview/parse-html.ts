/**
 * Extracts product details from a shop page's HTML using the metadata shops
 * publish for link previews and search engines:
 *   - JSON-LD `Product` (schema.org) — name, image, offers.price
 *   - Open Graph / Twitter meta tags — og:title, og:image, product:price:amount
 *   - <title> as a last resort
 * Regex-based on purpose: we only need <head>-level metadata, not a DOM.
 */
export interface PageDetails {
  title: string
  image: string
  price: number
}

/** Page titles that mean we got a block/consent page, not the product. */
const JUNK_TITLES =
  /^(robot check|access denied|just a moment|attention required|page not found|404|sorry|captcha|amazon\.com)\b/i

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
}

function clean(text: unknown): string {
  return typeof text === 'string' ? decodeEntities(text).replace(/\s+/g, ' ').trim() : ''
}

function readMetaTags(html: string): Map<string, string> {
  const meta = new Map<string, string>()
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>()
    for (const [, name, , value] of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      attrs.set(name.toLowerCase(), value)
    }
    const key = (attrs.get('property') ?? attrs.get('name') ?? attrs.get('itemprop'))?.toLowerCase()
    const content = attrs.get('content')
    if (key && content && !meta.has(key)) meta.set(key, clean(content))
  }
  return meta
}

interface JsonLdProduct {
  name?: unknown
  image?: unknown
  offers?: unknown
}

function findProduct(node: unknown): JsonLdProduct | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProduct(child)
      if (found) return found
    }
    return null
  }
  const record = node as Record<string, unknown>
  const type = record['@type']
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
    return record as JsonLdProduct
  }
  return findProduct(record['@graph'])
}

function readJsonLdProduct(html: string): JsonLdProduct | null {
  for (const [, body] of html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const product = findProduct(JSON.parse(body))
      if (product) return product
    } catch {
      /* malformed JSON-LD is common — skip it */
    }
  }
  return null
}

function firstImage(image: unknown): string {
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return firstImage(image[0])
  if (image && typeof image === 'object') return firstImage((image as { url?: unknown }).url)
  return ''
}

/** Parses "1,299.00" / "$48" style prices. Returns 0 when unusable. */
export function parsePrice(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : clean(value)
  const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/)
  const price = match ? Number(match[0]) : 0
  return Number.isFinite(price) && price > 0 && price < 1_000_000 ? price : 0
}

function offerPrice(offers: unknown): { price: number; currency: string } {
  const offer = Array.isArray(offers) ? offers[0] : offers
  if (!offer || typeof offer !== 'object') return { price: 0, currency: '' }
  const record = offer as Record<string, unknown>
  return {
    price: parsePrice(record.price ?? record.lowPrice),
    currency: clean(record.priceCurrency).toUpperCase(),
  }
}

export function absoluteUrl(src: string, base: string): string {
  if (!src) return ''
  try {
    const url = new URL(src, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function parseProductHtml(html: string, pageUrl: string): PageDetails {
  const meta = readMetaTags(html)
  const product = readJsonLdProduct(html)

  const pageTitle = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
    // "Product name | Shop" → "Product name"
    .replace(/\s+[|–—-]\s+[^|–—-]+$/, '')
  const title = [
    clean(product?.name),
    meta.get('og:title') ?? '',
    meta.get('twitter:title') ?? '',
    pageTitle,
  ].find((candidate) => candidate && !JUNK_TITLES.test(candidate))

  const image = absoluteUrl(
    firstImage(product?.image) ||
      meta.get('og:image:secure_url') ||
      meta.get('og:image') ||
      meta.get('twitter:image') ||
      '',
    pageUrl,
  )

  // Prices are shown in USD, so ignore prices we know are in another currency.
  const fromJsonLd = offerPrice(product?.offers)
  const metaCurrency = (
    meta.get('product:price:currency') ??
    meta.get('og:price:currency') ??
    meta.get('pricecurrency') ??
    ''
  ).toUpperCase()
  const fromMeta = parsePrice(
    meta.get('product:price:amount') ?? meta.get('og:price:amount') ?? meta.get('price'),
  )
  const price =
    fromJsonLd.price && (!fromJsonLd.currency || fromJsonLd.currency === 'USD')
      ? fromJsonLd.price
      : fromMeta && (!metaCurrency || metaCurrency === 'USD')
        ? fromMeta
        : 0

  return { title: title ?? '', image, price }
}
