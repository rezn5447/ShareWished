export function formatPrice(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}
// Share buttons in shop apps hand out short links whose host isn't the shop's name.
const SHORT_LINK_RETAILERS: Record<string, string> = {
  'a.co': 'Amazon',
  'amzn.to': 'Amazon',
  'amzn.eu': 'Amazon',
  'etsy.me': 'Etsy',
  'walmrt.us': 'Walmart',
}
export function retailerFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^(www|m|smile|shop)\./, '')
    if (SHORT_LINK_RETAILERS[host]) return SHORT_LINK_RETAILERS[host]
    const base = host.split('.')[0]
    return base.charAt(0).toUpperCase() + base.slice(1)
  } catch {
    return 'Link'
  }
}
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
export function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const target = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
export function formatEventDate(iso?: string): string | null {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
