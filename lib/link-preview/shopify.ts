/**
 * Shopify stores publish every product as JSON at /products/<handle>.js, and
 * the store's currency at /meta.json. Both are public storefront endpoints,
 * and steadier than reading the product page.
 */
import { absoluteUrl, type PageDetails } from './parse-html'

/** `/products/<handle>` or `/collections/<c>/products/<handle>`, nothing after. */
const PRODUCT_PATH = /^(?:\/collections\/[^/]+)?\/products\/([^/.]+)\/?$/

/** Where the store's product JSON would live, or null if this isn't a product path. */
export function shopifyProductJsonUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl)
    const handle = url.pathname.match(PRODUCT_PATH)?.[1]
    return handle ? `${url.origin}/products/${handle}.js` : null
  } catch {
    return null
  }
}

interface ShopifyVariant {
  id?: unknown
  price?: unknown
  featured_image?: { src?: unknown } | null
}

interface ShopifyProduct {
  title?: unknown
  price?: unknown
  featured_image?: unknown
  variants?: ShopifyVariant[]
}

/**
 * `productJson` is /products/<handle>.js and `shopJson` is /meta.json (either
 * may be unparseable; non-Shopify sites often answer with an HTML 404).
 * Prices are in cents and are kept only when the store sells in USD.
 */
export function parseShopifyProduct(
  productJson: string,
  shopJson: string | null,
  pageUrl: string,
): PageDetails | null {
  let product: ShopifyProduct
  try {
    product = JSON.parse(productJson)
  } catch {
    return null
  }
  if (typeof product?.title !== 'string') return null

  let currency = ''
  try {
    currency = String(JSON.parse(shopJson ?? '').currency ?? '').toUpperCase()
  } catch {
    /* unknown currency — drop the price below */
  }

  // A shared link often points at one colour/size via ?variant=<id>.
  const variantId = new URL(pageUrl).searchParams.get('variant')
  const variant = product.variants?.find((v) => String(v.id) === variantId)
  const cents = Number(variant?.price ?? product.price)
  const image = typeof variant?.featured_image?.src === 'string'
    ? variant.featured_image.src
    : typeof product.featured_image === 'string'
      ? product.featured_image
      : ''

  return {
    title: product.title.trim(),
    image: absoluteUrl(image, pageUrl),
    price: currency === 'USD' && Number.isFinite(cents) && cents > 0 ? cents / 100 : 0,
  }
}
