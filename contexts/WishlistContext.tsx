'use client'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { seedWishlists } from '@/data/wishlists'
import { CoverKey, Priority, Wishlist, WishlistItem } from '@/types/wishlist'
export interface NewListInput {
  title: string
  occasion: string
  eventDate?: string
  note?: string
  cover: CoverKey
  /** Display name of the signed-in owner, supplied by the caller (Clerk owns identity now). */
  ownerName: string
}
export interface NewItemInput {
  title: string
  url: string
  retailer: string
  image: string
  price: number
  note?: string
  priority: Priority
}
interface WishlistContextValue {
  /** Lists owned by the signed-in user, with every purchase field stripped. */
  myLists: Wishlist[]
  getOwnerList: (listId: string) => Wishlist | undefined
  /** The full list including purchase state — only for the share-link visitor view. */
  getSharedList: (shareId: string) => Wishlist | undefined
  createList: (input: NewListInput) => Wishlist
  deleteList: (listId: string) => void
  addItem: (listId: string, input: NewItemInput) => void
  removeItem: (listId: string, itemId: string) => void
  markPurchased: (shareId: string, itemId: string, gifterName: string) => void
  undoPurchase: (shareId: string, itemId: string) => void
  gifterName: string
  setGifterName: (name: string) => void
}
const WishlistContext = createContext<WishlistContextValue | null>(null)
function stripPurchases(list: Wishlist): Wishlist {
  return {
    ...list,
    items: list.items.map(({ purchase, ...rest }) => rest as WishlistItem),
  }
}
function makeShareId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24)
  return `${slug || 'list'}-${Math.random().toString(36).slice(2, 6)}`
}
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<Wishlist[]>(seedWishlists)
  const [gifterName, setGifterName] = useState('')
  const myLists = useMemo(
    () => lists.filter((list) => list.ownerId === 'me').map(stripPurchases),
    [lists],
  )
  const getOwnerList = useCallback(
    (listId: string) => {
      const found = lists.find((list) => list.id === listId && list.ownerId === 'me')
      return found ? stripPurchases(found) : undefined
    },
    [lists],
  )
  const getSharedList = useCallback(
    (shareId: string) => lists.find((list) => list.shareId === shareId),
    [lists],
  )
  const createList = useCallback((input: NewListInput) => {
    const list: Wishlist = {
      id: `list-${Date.now()}`,
      ownerId: 'me',
      ownerName: input.ownerName,
      title: input.title,
      occasion: input.occasion,
      eventDate: input.eventDate,
      note: input.note,
      cover: input.cover,
      shareId: makeShareId(input.title),
      createdAt: new Date().toISOString().slice(0, 10),
      items: [],
    }
    setLists((current) => [list, ...current])
    return list
  }, [])
  const deleteList = useCallback((listId: string) => {
    setLists((current) => current.filter((list) => list.id !== listId))
  }, [])
  const addItem = useCallback((listId: string, input: NewItemInput) => {
    const item: WishlistItem = {
      id: `item-${Date.now()}`,
      addedAt: new Date().toISOString().slice(0, 10),
      ...input,
    }
    setLists((current) =>
      current.map((list) =>
        list.id === listId ? { ...list, items: [item, ...list.items] } : list,
      ),
    )
  }, [])
  const removeItem = useCallback((listId: string, itemId: string) => {
    setLists((current) =>
      current.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list,
      ),
    )
  }, [])
  const markPurchased = useCallback((shareId: string, itemId: string, name: string) => {
    setLists((current) =>
      current.map((list) =>
        list.shareId === shareId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId
                  ? { ...item, purchase: { by: name, at: new Date().toISOString().slice(0, 10) } }
                  : item,
              ),
            }
          : list,
      ),
    )
  }, [])
  const undoPurchase = useCallback((shareId: string, itemId: string) => {
    setLists((current) =>
      current.map((list) =>
        list.shareId === shareId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, purchase: undefined } : item,
              ),
            }
          : list,
      ),
    )
  }, [])
  const value: WishlistContextValue = {
    myLists,
    getOwnerList,
    getSharedList,
    createList,
    deleteList,
    addItem,
    removeItem,
    markPurchased,
    undoPurchase,
    gifterName,
    setGifterName,
  }
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
export function useWishlists(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlists must be used inside a WishlistProvider')
  }
  return context
}
