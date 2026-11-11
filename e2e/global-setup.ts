import { clerkSetup } from '@clerk/testing/playwright'
import { userDb, type Db } from './support/db'
import { ensureUser, OWNER } from './support/users'
import './support/env'

/**
 * Runs once in the main process; env vars set here reach every worker.
 *  - Fetches a Clerk testing token so sign-in isn't blocked as bot traffic.
 *  - Makes sure the dedicated e2e user exists.
 *  - Deletes lists a crashed earlier run left behind. Only old ones: another
 *    run may be going at the same time, and its fresh lists are in use.
 */
export default async function globalSetup() {
  await clerkSetup({ dotenv: false })
  const id = await ensureUser(OWNER)
  process.env.E2E_OWNER_ID = id

  const runStart = new Date().toISOString()
  const { db, close } = await userDb(id)
  try {
    const anHourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
    const { error } = await db.from('wishlists').delete().eq('owner_id', id).lt('created_at', anHourAgo)
    if (error) {
      throw new Error(
        `Couldn't reach Supabase as the e2e user (${error.message}). Is the project paused, ` +
          'or is Clerk not connected under Supabase Third Party Auth?',
      )
    }
    await deletePreviewLog(db, id, { before: anHourAgo })
  } finally {
    await close()
  }

  // Teardown. Lookups the tests made would skew the link-reader baseline
  // (supabase/queries/usage.sql). Saved ones go with their lists; this clears the rest.
  return async () => {
    const { db: teardownDb, close: closeTeardown } = await userDb(id)
    try {
      await deletePreviewLog(teardownDb, id, { since: runStart })
    } finally {
      await closeTeardown()
    }
  }
}

async function deletePreviewLog(db: Db, ownerId: string, range: { before?: string; since?: string }) {
  let query = db.from('link_previews').delete().eq('owner_id', ownerId)
  if (range.before) query = query.lt('created_at', range.before)
  if (range.since) query = query.gte('created_at', range.since)
  const { error } = await query
  if (error) throw new Error(`Couldn't clear the e2e user's link preview log: ${error.message}`)
}
