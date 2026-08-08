'use client'
import { useMemo } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase client wired to Clerk via Supabase's native third-party auth
 * support (https://supabase.com/docs/guides/auth/third-party/clerk).
 *
 * `accessToken` is called on every request; when there's a signed-in Clerk
 * session it returns that session's token, which Supabase verifies and
 * exposes to Postgres as `auth.jwt()->>'sub'` for RLS. When there's no
 * session (an anonymous gifter viewing a share link) it returns null and
 * requests fall back to the public/anon RLS policies — no sign-in required
 * to view a list or claim a gift, matching how the app has always worked.
 *
 * Requires one manual step in the Supabase dashboard: Authentication →
 * Sign In / Providers → Third Party Auth → add Clerk (using your Clerk
 * domain from the Clerk dashboard's API Keys page). Until that's connected,
 * `auth.jwt()` won't resolve and every request is treated as anonymous.
 */
export function useSupabaseClient(): SupabaseClient<Database> {
  const { session } = useSession()

  return useMemo(() => {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      accessToken: async () => (session ? await session.getToken() : null),
    })
  }, [session])
}
