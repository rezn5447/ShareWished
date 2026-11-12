import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { LinkPreview } from '@/types/wishlist'

/** Where one field of a preview came from. 'none' = nothing, not even a guess. */
export type FieldOrigin = 'page' | 'shopify' | 'link' | 'none'

export interface PreviewLogEntry {
  url: string
  resolvedUrl: string
  preview: LinkPreview
  from: { title: FieldOrigin; price: FieldOrigin; image: FieldOrigin }
}

/**
 * Records a served preview in `link_previews` (the baseline numbers for the
 * AI work). Runs as the signed-in owner via their Clerk token, so RLS applies
 * just as it does in the browser. Never throws: a failed log must not cost
 * the person their preview. Returns the row id, or undefined.
 */
export async function logLinkPreview(accessToken: string, entry: PreviewLogEntry): Promise<string | undefined> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { accessToken: async () => accessToken },
    )
    const { preview, from } = entry
    const { data, error } = await supabase
      .from('link_previews')
      .insert({
        url: entry.url,
        resolved_url: entry.resolvedUrl,
        retailer: preview.retailer,
        source: preview.source,
        title: preview.title,
        price: preview.price,
        image: preview.image,
        title_from: from.title,
        price_from: from.price,
        image_from: from.image,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  } catch (error) {
    console.error('link preview log failed', error)
    return undefined
  }
}
