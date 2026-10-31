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
  }
}

/**
 * Pulls product details for a pasted link. Asks our server to read the page
 * (see app/api/link-preview); if that fails or the shop blocks it, falls back
 * to whatever the link itself tells us. Never invents a product.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const trimmed = url.trim()
  if (!isValidUrl(trimmed)) {
    throw new Error("That doesn't look like a product link. Paste the full web address.")
  }
  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(trimmed)}`)
    if (response.ok) return (await response.json()) as LinkPreview
  } catch {
    /* network error — use the link-only guess below */
  }
  return previewFromUrl(trimmed)
}
