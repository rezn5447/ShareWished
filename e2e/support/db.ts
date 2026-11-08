import { randomBytes } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { env } from './env'
import { clerkBackend, OWNER } from './users'

export type Db = SupabaseClient<Database>

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** What an anonymous gifter's browser gets: the anon role. */
export function anonDb(): Db {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, noSession)
}

/**
 * A Supabase client signed in as `userId`, the same way the browser is: a
 * Clerk session token that Supabase trusts via third-party auth. The session
 * is created through Clerk's backend API, so no browser is needed.
 */
export async function userDb(userId: string): Promise<{ db: Db; close: () => Promise<void> }> {
  const clerk = clerkBackend()
  const session = await clerk.sessions.createSession({ userId })
  let cached: { jwt: string; until: number } | null = null
  const db = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    ...noSession,
    accessToken: async () => {
      if (!cached || cached.until < Date.now()) {
        const token = await clerk.sessions.getToken(session.id, undefined, 120)
        cached = { jwt: token.jwt, until: Date.now() + 90_000 }
      }
      return cached.jwt
    },
  })
  return {
    db,
    close: async () => {
      await clerk.sessions.revokeSession(session.id).catch(() => {})
    },
  }
}

export interface SeedItem {
  title: string
  price?: number
  priority?: 'low' | 'normal' | 'must'
}
export interface SeededList {
  id: string
  shareId: string
  title: string
  items: Array<{ id: string; title: string }>
}

/** Inserts a list straight into the database, as the owner. Faster than the UI for setup. */
export async function insertList(
  db: Db,
  ownerId: string,
  title: string,
  items: SeedItem[],
): Promise<SeededList> {
  const shareId = `e2e-${randomBytes(9).toString('hex')}`
  const { data: list, error } = await db
    .from('wishlists')
    .insert({
      owner_id: ownerId,
      owner_name: OWNER.fullName,
      title,
      occasion: 'Birthday',
      cover: 'birthday',
      share_id: shareId,
    })
    .select('id')
    .single()
  if (error) throw error
  const created: SeededList = { id: list.id, shareId, title, items: [] }
  for (const [index, item] of items.entries()) {
    const { data, error: itemError } = await db
      .from('wishlist_items')
      .insert({
        wishlist_id: list.id,
        title: item.title,
        url: `https://example.com/e2e/${index}`,
        retailer: 'Example',
        image: '/item-placeholder.svg',
        price: item.price ?? 25,
        priority: item.priority ?? 'normal',
        // Stagger so the UI order (newest first) is predictable.
        added_at: new Date(Date.now() - index * 60_000).toISOString(),
      })
      .select('id')
      .single()
    if (itemError) throw itemError
    created.items.push({ id: data.id, title: item.title })
  }
  return created
}

export async function deleteLists(db: Db, ids: string[]) {
  if (ids.length === 0) return
  // Items and purchases go with the list (on delete cascade).
  const { error } = await db.from('wishlists').delete().in('id', ids)
  if (error) throw error
}
