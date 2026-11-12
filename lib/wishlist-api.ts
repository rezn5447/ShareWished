'use client'
import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSupabaseClient } from './supabase/client'
import { CoverKey, Priority, Wishlist, WishlistItem } from '@/types/wishlist'
import { ITEM_IMAGE_BUCKET, uploadedImagePath } from '@/utils/itemImage'

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
  edited_at: string | null
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
/** Purchase as exposed by `get_shared_list` — never includes the claim token. */
interface PurchaseRow {
  gifter_name: string
  purchased_at: string
}
interface SharedListPayload {
  list: ListRow
  is_owner: boolean
  items: Array<ItemRow & { purchase: PurchaseRow | null }>
}

const CLAIM_ERRORS: Record<string, string> = {
  already_claimed: 'Someone just claimed this one. Pick another gift?',
  own_list: "This is your own list — gifts are claimed by your visitors.",
  item_not_found: 'That item was removed from the list.',
  invalid_name: 'Add a name so others know this is covered.',
}

function claimError(error: { message: string }): Error {
  const key = Object.keys(CLAIM_ERRORS).find((code) => error.message.includes(code))
  return new Error(key ? CLAIM_ERRORS[key] : "Couldn't save that. Try again in a moment.")
}

function mapItem(row: ItemRow, purchase?: PurchaseRow | null): WishlistItem {
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
    editedAt: row.edited_at ?? undefined,
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
  // Share links are the only way into a list, so the suffix must not be guessable.
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const suffix = Array.from(bytes, (b) => (b % 36).toString(36)).join('')
  return `${slug || 'list'}-${suffix}`
}

/** The parts of a list its owner fills in, on create and on edit. */
export interface ListDetailsInput {
  title: string
  occasion: string
  eventDate?: string
  note?: string
  cover: CoverKey
}
export interface NewListInput extends ListDetailsInput {
  ownerId: string
  ownerName: string
}
/** The parts of an item its owner fills in, on add and on edit. */
export interface ItemDetailsInput {
  title: string
  url: string
  retailer: string
  image: string
  price: number
  note?: string
  priority: Priority
  /** A photo the owner picked, already shrunk. Uploaded on save and used instead of `image`. */
  imageFile?: Blob
}
export interface NewItemInput extends ItemDetailsInput {
  /** The link lookup this item came from, if it finished for this link. */
  preview?: {
    id: string
    /** The name the form was filled with, before the person changed anything. */
    filledTitle: string
  }
}

/**
 * Thin data-access layer over the `wishlists` / `wishlist_items` / `purchases`
 * tables. Each page fetches what it needs on mount rather than a global
 * client-side cache — with a real backend, a fresh fetch per page/navigation
 * is simpler to reason about than keeping an in-memory store in sync.
 */
export function useWishlistApi() {
  const supabase = useSupabaseClient()
  const { userId } = useAuth()

  /** Stores a picked photo under the owner's folder and returns its public URL. */
  const uploadImage = useCallback(
    async (file: Blob): Promise<string> => {
      if (!userId) throw new Error('Sign in to add a photo.')
      // Random name, never overwritten: the bucket has no UPDATE policy on purpose.
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage
        .from(ITEM_IMAGE_BUCKET)
        .upload(path, file, { contentType: 'image/jpeg', upsert: false })
      if (error) throw error
      return supabase.storage.from(ITEM_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    },
    [supabase, userId],
  )

  /**
   * Deletes uploaded photos nothing points at any more. Best effort: the item
   * change already succeeded, and a leftover file is only wasted space.
   * Shop photos and other people's files are skipped.
   */
  const removeImages = useCallback(
    async (imageUrls: string[]) => {
      if (!userId) return
      const paths = imageUrls
        .map((url) => uploadedImagePath(url, userId))
        .filter((path): path is string => path !== null)
      if (paths.length === 0) return
      const { error } = await supabase.storage.from(ITEM_IMAGE_BUCKET).remove(paths)
      if (error) console.error('item photo cleanup failed', error)
    },
    [supabase, userId],
  )

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
      // Goes through a security-definer function: purchases are stripped
      // server-side when the caller owns the list, which is where surprise
      // mode is actually enforced (see supabase/migrations).
      const { data, error } = await supabase.rpc('get_shared_list', { p_share_id: shareId })
      if (error) throw error
      if (!data) return null
      const payload = data as unknown as SharedListPayload
      return mapList(
        payload.list,
        payload.items.map((i) => mapItem(i, i.purchase)),
      )
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

  /**
   * Saves the whole form: optional fields left out are cleared. Only the
   * owner-editable columns are written; owner, share id and dates stay put.
   */
  const updateList = useCallback(
    async (listId: string, input: ListDetailsInput): Promise<void> => {
      const { error } = await supabase
        .from('wishlists')
        .update({
          title: input.title,
          occasion: input.occasion,
          event_date: input.eventDate ?? null,
          note: input.note ?? null,
          cover: input.cover,
        })
        .eq('id', listId)
        // RLS turns someone else's list into "0 rows", not an error.
        .select('id')
        .single()
      if (error) throw error
    },
    [supabase],
  )

  const deleteList = useCallback(
    async (listId: string) => {
      // Items go with the list (on delete cascade), so note their photos first.
      const { data: items } = await supabase.from('wishlist_items').select('image').eq('wishlist_id', listId)
      const { error } = await supabase.from('wishlists').delete().eq('id', listId)
      if (error) throw error
      await removeImages((items ?? []).map((item) => item.image))
    },
    [supabase, removeImages],
  )

  const addItem = useCallback(
    async (listId: string, input: NewItemInput): Promise<WishlistItem> => {
      const image = input.imageFile ? await uploadImage(input.imageFile) : input.image
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: listId,
          title: input.title,
          url: input.url,
          retailer: input.retailer,
          image,
          price: input.price,
          note: input.note ?? null,
          priority: input.priority,
        })
        .select('*')
        .single()
      if (error) {
        if (image !== input.image) await removeImages([image])
        throw error
      }
      if (input.preview) {
        // Measurement only (see the link_previews migration), so a failure
        // here must not undo or fail the add.
        const { error: logError } = await supabase
          .from('link_previews')
          .update({
            item_id: data.id,
            filled_title: input.preview.filledTitle,
            saved_title: input.title,
            saved_price: input.price,
            saved_at: new Date().toISOString(),
          })
          .eq('id', input.preview.id)
        if (logError) console.error('link preview log failed', logError)
      }
      return mapItem(data)
    },
    [supabase, uploadImage, removeImages],
  )

  /**
   * Same rules as updateList. Claims stay attached to the item, which is why
   * the edit sheet steers owners towards adding a new item instead of
   * swapping in a different product.
   */
  const updateItem = useCallback(
    async (itemId: string, input: ItemDetailsInput): Promise<WishlistItem> => {
      // Read what's saved rather than trusting the form, so a replaced photo is always cleaned up.
      const { data: before, error: readError } = await supabase
        .from('wishlist_items')
        .select('image')
        .eq('id', itemId)
        .single()
      if (readError) throw readError
      const image = input.imageFile ? await uploadImage(input.imageFile) : input.image
      const { data, error } = await supabase
        .from('wishlist_items')
        .update({
          title: input.title,
          url: input.url,
          retailer: input.retailer,
          image,
          price: input.price,
          note: input.note ?? null,
          priority: input.priority,
        })
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) {
        if (image !== input.image) await removeImages([image])
        throw error
      }
      if (before.image !== data.image) await removeImages([before.image])
      return mapItem(data)
    },
    [supabase, uploadImage, removeImages],
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      const { data, error } = await supabase.from('wishlist_items').delete().eq('id', itemId).select('image')
      if (error) throw error
      await removeImages(data.map((item) => item.image))
    },
    [supabase, removeImages],
  )

  /** Returns the claim token the gifter needs to undo later. */
  const markPurchased = useCallback(
    async (itemId: string, gifterName: string): Promise<string> => {
      const { data, error } = await supabase.rpc('claim_item', {
        p_item_id: itemId,
        p_gifter_name: gifterName,
      })
      if (error) throw claimError(error)
      return data
    },
    [supabase],
  )

  const undoPurchase = useCallback(
    async (itemId: string, claimToken: string) => {
      const { error } = await supabase.rpc('unclaim_item', {
        p_item_id: itemId,
        p_claim_token: claimToken,
      })
      if (error) throw claimError(error)
    },
    [supabase],
  )

  return useMemo(
    () => ({
      fetchMyLists,
      fetchOwnerList,
      fetchSharedList,
      createList,
      updateList,
      deleteList,
      addItem,
      updateItem,
      removeItem,
      markPurchased,
      undoPurchase,
    }),
    [
      fetchMyLists,
      fetchOwnerList,
      fetchSharedList,
      createList,
      updateList,
      deleteList,
      addItem,
      updateItem,
      removeItem,
      markPurchased,
      undoPurchase,
    ],
  )
}
