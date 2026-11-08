# Gimme

Wishlist app: owners make lists and share a link; friends claim gifts without the owner ever seeing what's claimed ("surprise mode"). Next.js 16 App Router, React 18, Tailwind 3, Clerk (auth), Supabase (Postgres + RLS). Setup and route map are in README.md.

## Commands

- `npm run dev` — local server on :3000
- `npm run lint` — ESLint (flat config, `eslint-config-next`)
- `npx tsc --noEmit` — type-check
- `npm run test:e2e` — Playwright end-to-end tests (builds and serves on :3100; see `e2e/README.md`). They use a dedicated Clerk user, `e2e-owner+clerk_test@example.com`, not the seed users, and delete the lists they create.
- `npm run seed` — creates Clerk test users and writes `supabase/seed.generated.sql` (gitignored; run it in the Supabase SQL editor). Refuses non-`sk_test_` keys.

Test sign-in: `maya+clerk_test@example.com` (also jordan, priya, theo, ben), code `424242`.

## How auth reaches the database

- Clerk is the only identity provider. Supabase trusts Clerk session tokens via third-party auth; in Postgres the user id is `auth.jwt() ->> 'sub'` (a Clerk id string, not a uuid). Do not use `auth.uid()`.
- `lib/supabase/client.ts` is a client-side hook that passes the Clerk token on every request. No token = `anon` role.
- `lib/wishlist-api.ts` is the only client-side module that talks to Supabase. Keep it that way. The one server-side exception is `lib/shared-list-preview.ts` (always anonymous, feeds share-link metadata and the OG image). It must never expose purchase data, because owners see link previews too.
- `proxy.ts` is Next 16's replacement for `middleware.ts` — route protection lives there, not in a `middleware.ts`.

## Surprise mode — the invariant that must not break

An owner must never be able to learn which of their items are claimed or by whom.

- `purchases` has RLS on and **no policies, no grants** to `anon`/`authenticated`. That's deliberate — don't "fix" the advisor warning by adding a policy.
- All gifter access goes through three `security definer` functions (callable by `anon` on purpose): `get_shared_list` (strips purchase data when the caller is the owner), `claim_item` (one claim per item, returns a claim token), `unclaim_item` (requires that token). The gifter's browser keeps the token in `localStorage`.
- `anon` cannot select from any table directly; lists are reachable only by `share_id`.
- Any change touching these functions, grants, or policies needs a check that the owner path still gets `purchase: null`: run `npx playwright test surprise-mode`.

## Database changes

- Migrations live in `supabase/migrations/` and are written to be re-runnable (`if not exists`, policies reset at the top of the security migration).
- After a schema change: apply the migration, regenerate `lib/supabase/database.types.ts` (Supabase MCP `generate_typescript_types`), then run the security + performance advisors.
- Supabase project: `wishlisted` (ref `kxicwfigzrtlmkkvkilu`; it kept the app's old name). The live migration history doesn't match the file names in the repo (the security migration was applied via the SQL editor), so check live state before assuming `supabase db push` will do the right thing.

## Link previews

`app/api/link-preview/route.ts` fetches arbitrary user-supplied URLs server-side. It's signed-in only (via `proxy.ts`) and blocks private/loopback addresses before each hop. Any change there must keep those SSRF checks intact; don't reuse `fetchPage` elsewhere without them.

## Conventions

- Mobile-first UI: screens wrap in `MobileScreen`, actions open bottom `Sheet`s.
- Prices are USD only; non-USD prices from scraped pages are dropped.
- Comments explain *why*, briefly; match the existing density.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
