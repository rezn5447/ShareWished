import { config } from 'dotenv'

// Same files Next reads, so tests hit the same Clerk and Supabase as `npm run dev`.
config({ path: ['.env.local', '.env'], quiet: true })

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set. Copy .env.local.example to .env.local and fill it in.`)
  return value
}

export const env = {
  get clerkSecretKey() {
    const key = required('CLERK_SECRET_KEY')
    // Tests create users and sign-in tokens; never do that against a live instance.
    if (!key.startsWith('sk_test_')) {
      throw new Error('Refusing to run e2e tests: CLERK_SECRET_KEY must be a development (sk_test_) key.')
    }
    return key
  },
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseAnonKey() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
}
