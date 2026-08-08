'use client'
import { useCallback, useMemo } from 'react'
import { useSupabaseClient } from './supabase/client'
import { CoverKey, Priority, Wishlist, WishlistItem } from '@/types/wishlist'

interface ItemRow {
  id: string
  wishlist_id: string
  title: string
  url: string
  retailer: string
  image: string
  price: number
  note: string | null
  priority: string
  added_at: string
}
interface ListRow {
  id: string
  owner_id: string
  owner_name: string
  title: string
  occasion: string
  event_date: string | null
  note: string | null
  cover: string
  share_id: string
  created_at: string
}
interface PurchaseRow {
  id: string
  item_id: string
  gifter_name: string
  purchased_at: string
}

function mapItem(row: ItemRow, purchase?: PurchaseRow): WishlistItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    retailer: row.retailer,
    image: row.image,
    price: Number(row.price),
    note: row.note ?? undefined,
    priority: row.priority as Priority,
    addedAt: row.added_at,
    purchase: purchase ? { by: purchase.gifter_name, at: purchase.purchased_at } : undefined,
  }
}

function mapList(row: ListRow, items: WishlistItem[]): Wishlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    occasion: row.occasion,
    eventDate: row.event_date ?? undefined,
    note: row.note ?? undefined,
    cover: row.cover as CoverKey,
    shareId: row.share_id,
    createdAt: row.created_at,
    items,
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

export interface NewListInput {
  title: string
  occasion: string
  eventDate?: string
  note?: string
  cover: CoverKey
  ownerId: string
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

/**
 * Thin data-access layer over the `wishlists` / `wishlist_items` / `purchases`
 * tables. Each page fetches what it needs on mount rather than a global
 * client-side cache — with a real backend, a fresh fetch per page/navigation
 * is simpler to reason about than keeping an in-memory store in sync.
 */
export function useWishlistApi() {
  const supabase = useSupabaseClient()

  const fetchMyLists = useCallback(
    async (ownerId: string): Promise<Wishlist[]> => {
      const { data: lists, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!lists || lists.length === 0) return []
      const { data: items, error: itemsError } = await supabase
        .from('wishlist_items')
        .select('*')
        .in(
          'wishlist_id',
          lists.map((l) => l.id),
        )
        .order('added_at', { ascending: false })
      if (itemsError) throw itemsError
      return lists.map((list) =>
        mapList(
          list,
          (items ?? []).filter((i) => i.wishlist_id === list.id).map((i) => mapItem(i)),
        ),
      )
    },
    [supabase],
  )

  const fetchOwnerList = useCallback(
    async (listId: string, ownerId: string): Promise<Wishlist | null> => {
      const { data: list, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('id', listId)
        .maybeSingle()
      if (error) throw error
      if (!list || list.owner_id !== ownerId) return null
      const { data: items, error: itemsError } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('wishlist_id', listId)
        .order('added_at', { ascending: false })
      if (itemsError) throw itemsError
      return mapList(list, (items ?? []).map((i) => mapItem(i)))
    },
    [supabase],
  )

  const fetchSharedList = useCallback(
    async (shareId: string): Promise<Wishlist | null> => {
      const { data: list, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('share_id', shareId)
        .maybeSingle()
      if (error) throw error
      if (!list) return null
      const { data: items, error: itemsError } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('wishlist_id', list.id)
        .order('added_at', { ascending: false })
      if (itemsError) throw itemsError
      const itemIds = (items ?? []).map((i) => i.id)
      let purchases: PurchaseRow[] = []
      if (itemIds.length > 0) {
        // Returns nothing for items the requester doesn't have visibility
        // into — this is where "surprise mode" is actually enforced, at
        // the database level, not just in this file.
        const { data: purchaseRows, error: purchasesError } = await supabase
          .from('purchases')
          .select('*')
          .in('item_id', itemIds)
        if (purchasesError) throw purchasesError
        purchases = purchaseRows ?? []
      }
      const mappedItems = (items ?? []).map((i) =>
        mapItem(
          i,
          purchases.find((p) => p.item_id === i.id),
        ),
      )
      return mapList(list, mappedItems)
    },
    [supabase],
  )

  const createList = useCallback(
    async (input: NewListInput): Promise<Wishlist> => {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          owner_id: input.ownerId,
          owner_name: input.ownerName,
          title: input.title,
          occasion: input.occasion,
          event_date: input.eventDate ?? null,
          note: input.note ?? null,
          cover: input.cover,
          share_id: makeShareId(input.title),
        })
        .select('*')
        .single()
      if (error) throw error
      return mapList(data, [])
    },
    [supabase],
  )

  const deleteList = useCallback(
    async (listId: string) => {
      const { error } = await supabase.from('wishlists').delete().eq('id', listId)
      if (error) throw error
    },
    [supabase],
  )

  const addItem = useCallback(
    async (listId: string, input: NewItemInput): Promise<WishlistItem> => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: listId,
          title: input.title,
          url: input.url,
          retailer: input.retailer,
          image: input.image,
          price: input.price,
          note: input.note ?? null,
          priority: input.priority,
        })
        .select('*')
        .single()
      if (error) throw error
      return mapItem(data)
    },
    [supabase],
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      const { error } = await supabase.from('wishlist_items').delete().eq('id', itemId)
      if (error) throw error
    },
    [supabase],
  )

  const markPurchased = useCallback(
    async (itemId: string, gifterName: string) => {
      const { error } = await supabase
        .from('purchases')
        .insert({ item_id: itemId, gifter_name: gifterName })
      if (error) throw error
    },
    [supabase],
  )

  const undoPurchase = useCallback(
    async (itemId: string) => {
      const { error } = await supabase.from('purchases').delete().eq('item_id', itemId)
      if (error) throw error
    },
    [supabase],
  )

  return useMemo(
    () => ({
      fetchMyLists,
      fetchOwnerList,
      fetchSharedList,
      createList,
      deleteList,
      addItem,
      removeItem,
      markPurchased,
      undoPurchase,
    }),
    [
      fetchMyLists,
      fetchOwnerList,
      fetchSharedList,
      createList,
      deleteList,
      addItem,
      removeItem,
      markPurchased,
      undoPurchase,
    ],
  )
}
