import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'
import { CoverKey } from '@/types/wishlist'

/**
 * What a link preview (iMessage, WhatsApp, Slack…) may show about a list.
 * Never includes purchase data: the owner sees these cards too, e.g. when
 * pasting their own link, so a claimed count here would break surprise mode.
 */
export interface SharedListPreview {
  ownerFirstName: string
  title: string
  occasion: string
  eventDate: string | null
  cover: CoverKey
  itemCount: number
}

interface PreviewPayload {
  list: {
    owner_name: string
    title: string
    occasion: string
    event_date: string | null
    cover: string
  }
  items: unknown[]
}

/**
 * Server-only counterpart to `useWishlistApi().fetchSharedList`, used for
 * metadata and the OG image. Always anonymous — crawlers have no session.
 */
export const fetchSharedListPreview = cache(
  async (shareId: string): Promise<SharedListPreview | null> => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data, error } = await supabase.rpc('get_shared_list', { p_share_id: shareId })
    if (error || !data) return null
    const { list, items } = data as unknown as PreviewPayload
    return {
      ownerFirstName: list.owner_name.split(' ')[0],
      title: list.title,
      occasion: list.occasion,
      eventDate: list.event_date,
      cover: list.cover as CoverKey,
      itemCount: items.length,
    }
  },
)
