import { createClerkClient } from '@clerk/backend'
import { env } from './env'

/**
 * Dedicated test user, separate from the `npm run seed` friends so tests
 * never touch seed data. `+clerk_test` addresses accept the code 424242.
 */
export const OWNER = {
  email: 'e2e-owner+clerk_test@example.com',
  username: 'e2e_owner',
  firstName: 'Erin',
  lastName: 'Endtoend',
  fullName: 'Erin Endtoend',
}

/** Saved browser state for the signed-in owner, written by auth.setup.ts. */
export const OWNER_STATE = 'e2e/.auth/owner.json'

export function clerkBackend() {
  return createClerkClient({ secretKey: env.clerkSecretKey })
}

/** Returns the Clerk user id, creating the user on first run. */
export async function ensureUser(user: typeof OWNER): Promise<string> {
  const clerk = clerkBackend()
  const existing = await clerk.users.getUserList({ emailAddress: [user.email] })
  if (existing.data.length > 0) return existing.data[0].id
  const created = await clerk.users.createUser({
    emailAddress: [user.email],
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    skipPasswordRequirement: true,
  })
  return created.id
}

export function ownerId(): string {
  const id = process.env.E2E_OWNER_ID
  if (!id) throw new Error('E2E_OWNER_ID is missing; it is set by e2e/global-setup.ts.')
  return id
}
