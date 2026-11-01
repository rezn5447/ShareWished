export type Priority = 'low' | 'normal' | 'must'
export interface Purchase {
  /** Display name the gifter entered when claiming. */
  by: string
  /** ISO date string. */
  at: string
}
export interface WishlistItem {
  id: string
  title: string
  url: string
  retailer: string
  image: string
  price: number
  note?: string
  priority: Priority
  addedAt: string
  /**
   * Only ever present on the visitor (gifter) view of a list.
   * The owner selectors strip this field so it can never be rendered to them.
   */
  purchase?: Purchase
}
export interface Wishlist {
  id: string
  ownerId: string
  ownerName: string
  title: string
  occasion: string
  eventDate?: string
  note?: string
  cover: CoverKey
  shareId: string
  createdAt: string
  items: WishlistItem[]
}
export type CoverKey = 'birthday' | 'wedding' | 'home' | 'baby' | 'holiday' | 'just-because'
export interface User {
  id: string
  name: string
  email: string
}
export interface LinkPreview {
  title: string
  price: number
  image: string
  retailer: string
  /** 'page' when the shop gave us details; 'link' when it's only a guess from the URL. */
  source: 'page' | 'link'
}
