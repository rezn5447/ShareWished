import { LinkPreview } from '@/types/wishlist'
import { isValidUrl, retailerFromUrl } from './format'
const CATALOG: Array<{ keywords: string[]; preview: Omit<LinkPreview, 'retailer'> }> = [
  {
    keywords: ['headphone', 'audio', 'sony', 'bose', 'anc'],
    preview: {
      title: 'Studio Wireless Noise-Cancelling Headphones',
      price: 279,
      image:
        'https://cdn.magicpatterns.com/patterns/generated-images/0a8e3950-8dcf-40d1-afb9-7c4c5dc37b8c.jpg',
    },
  },
  {
    keywords: ['mug', 'ceramic', 'kitchen', 'cup', 'pottery'],
    preview: {
      title: 'Speckled Stoneware Mug Set (2)',
      price: 48,
      image:
        'https://cdn.magicpatterns.com/patterns/generated-images/5d7c83a8-4519-4326-8c48-b4293e137eb5.jpg',
    },
  },
  {
    keywords: ['shoe', 'sneaker', 'running', 'trainer'],
    preview: {
      title: 'Everyday Runner — Sage / Bone',
      price: 132,
      image:
        'https://cdn.magicpatterns.com/patterns/generated-images/4f3c0583-cccd-47cd-9a06-4ea9081f4d10.jpg',
    },
  },
  {
    keywords: ['book', 'cookbook', 'recipe', 'read'],
    preview: {
      title: 'Slow Sundays: A Cookbook for Long Mornings',
      price: 35,
      image:
        'https://cdn.magicpatterns.com/patterns/generated-images/2e6645e0-2b19-4e05-a062-cd271270b0b5.jpg',
    },
  },
  {
    keywords: ['camera', 'polaroid', 'instant', 'film', 'photo'],
    preview: {
      title: 'Instant Film Camera — Silver',
      price: 119,
      image:
        'https://cdn.magicpatterns.com/patterns/generated-images/50074596-87a7-4b48-a326-b1489ca462ec.jpg',
    },
  },
]
const FALLBACK_IMAGE =
  'https://cdn.magicpatterns.com/patterns/generated-images/5d7c83a8-4519-4326-8c48-b4293e137eb5.jpg'
/**
 * Simulates fetching product metadata from a pasted retailer link.
 */
export function fetchLinkPreview(url: string): Promise<LinkPreview> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (!isValidUrl(url)) {
        reject(new Error("That doesn't look like a product link. Paste the full web address."))
        return
      }
      const haystack = url.toLowerCase()
      const match = CATALOG.find((entry) => entry.keywords.some((k) => haystack.includes(k)))
      const retailer = retailerFromUrl(url)
      if (match) {
        resolve({ ...match.preview, retailer })
        return
      }
      resolve({
        title: `Item from ${retailer}`,
        price: 0,
        image: FALLBACK_IMAGE,
        retailer,
      })
    }, 1100)
  })
}
