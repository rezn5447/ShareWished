import { LinkPreview } from '@/types/wishlist'
import { isValidUrl, retailerFromUrl } from './format'

/** Shown when neither the page nor the link gives us a product photo. */
export const PLACEHOLDER_IMAGE = '/item-placeholder.svg'

/**
 * Best guess at a product name from the link alone — no network. Many shops
 * put a readable slug in the path, e.g. amazon.com/crocs-Unisex-Classic/dp/…
 * or etsy.com/listing/123/handmade-mug. Query strings (tracking junk) are
 * ignored. Returns '' when nothing looks like a name.
 */
export function titleFromUrl(url: string): string {
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return ''
  }
  const segments = pathname
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })
    .map((segment) => segment.replace(/\.(html?|php|aspx?)$/i, ''))

  // Amazon: the slug sits right before /dp/<ASIN>.
  const dpIndex = segments.findIndex((segment) => segment === 'dp')
  const candidates =
    dpIndex > 0
      ? [segments[dpIndex - 1]]
      : segments.filter((segment) => /[a-z]{2,}[-_+][a-z]{2,}/i.test(segment))

  // Prefer the segment with the most words; IDs and short codes lose out.
  const best = candidates
    .map((segment) => segment.split(/[-_+\s]+/).filter((word) => /[a-z]/i.test(word)))
    .sort((a, b) => b.length - a.length)[0]
  if (!best || best.length < 2) return ''
  return best.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/** Fallback preview built only from the link. */
export function previewFromUrl(url: string): LinkPreview {
  return {
    title: titleFromUrl(url),
    price: 0,
    image: PLACEHOLDER_IMAGE,
    retailer: retailerFromUrl(url),
    source: 'link',
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Splits what a shop app's Share button copies into the link and the product
 * name around it, e.g. "Amazon.com: Crocs Classic Clog https://a.co/d/xyz" or
 * "Check out Stanley Quencher at Target https://target.com/p/…". The name is
 * the useful part when the shop blocks us from reading its page.
 */
export function parseSharedText(text: string): { url: string; title: string } {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  const url = match?.[0].replace(/[.,;:!?)\]]+$/, '') ?? ''
  if (!match || !isValidUrl(url)) return { url: '', title: '' }

  const shop = escapeRegExp(retailerFromUrl(url))
  const title = text
    .replace(match[0], ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(check out|look at|i found|found)( this| these)?\b[:!,-]?\s*/i, '')
    .replace(new RegExp(`^${shop}(\\.[a-z.]+)?\\s*:\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*(?:[|–—:-]|\\b(?:on|at|from|via))\\s*${shop}(\\.[a-z.]+)?$`, 'i'), '')
    .replace(/^["“'‘]+|["”'’.,:!-]+$/g, '')
    .trim()
  // "Check out this item on Etsy" leaves just "item": not a name.
  const generic = /^(this |these |the )?(item|product|listing|deal|find)s?$/i
  return { url, title: title.length > 2 && /[a-z]/i.test(title) && !generic.test(title) ? title : '' }
}

/**
 * Pulls product details for a pasted link (or shared text containing one).
 * Asks our server to read the page (see app/api/link-preview); if that fails
 * or the shop blocks it, falls back to the shared text, then the link itself.
 * Never invents a product.
 */
export async function fetchLinkPreview(input: string): Promise<LinkPreview & { url: string }> {
  const { url, title: sharedTitle } = parseSharedText(input.trim())
  if (!url) {
    throw new Error("That doesn't look like a product link. Paste the full web address.")
  }
  let preview = previewFromUrl(url)
  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    if (response.ok) preview = (await response.json()) as LinkPreview
  } catch {
    /* network error — keep the link-only guess */
  }
  // The shop's own share text beats a guess from the URL slug.
  if (preview.source === 'link' && sharedTitle) preview = { ...preview, title: sharedTitle }
  return { ...preview, url }
}
