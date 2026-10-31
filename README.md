# Wishlisted

Make a wishlist, share a link, and let friends claim gifts without you ever seeing what's been bought ("surprise mode").

Built with Next.js (App Router), Tailwind CSS, [Clerk](https://clerk.com) for sign-in, and [Supabase](https://supabase.com) for the database.

## Requirements

- Node.js 20.9 or newer
- A Clerk application
- A Supabase project

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → your app → **API Keys** |
| `CLERK_SECRET_KEY` | Clerk dashboard → your app → **API Keys** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → **Project Settings → API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → **Project Settings → API** (publishable / anon key) |

`.env.local` is gitignored. Never commit it.

## 3. Connect Clerk to Supabase

Supabase checks the signed-in user's Clerk session to decide who owns which lists. Turn this on once per Supabase project:

1. In the Clerk dashboard, open **Integrations → Supabase** and activate it. Copy the Clerk domain it shows.
2. In the Supabase dashboard, open **Authentication → Sign In / Providers → Third Party Auth**, add **Clerk**, and paste that domain.

Until this is connected, every request is treated as an anonymous visitor: share links still open, but you won't see or create your own lists.

## 4. Set up the database

The schema and access rules live in [`supabase/migrations`](supabase/migrations). Run them in order against your project:

| File | What it does |
| --- | --- |
| `20261030000000_baseline_schema.sql` | Creates the `wishlists`, `wishlist_items` and `purchases` tables. |
| `20261030000100_surprise_mode_security.sql` | Access rules, plus the `get_shared_list`, `claim_item` and `unclaim_item` functions that enforce surprise mode. |

Either paste each file into the Supabase **SQL Editor** and run it, or use the [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Both files are safe to run more than once.

> Free Supabase projects pause after a week of inactivity. If the app suddenly can't load anything, check the dashboard and restore the project.

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000.

To build and run a production version locally:

```bash
npm run build
npm start
```

To check the code with ESLint:

```bash
npm run lint
```

## How it fits together

| Route | Who | What |
| --- | --- | --- |
| `/` | Everyone | Sign in / sign up |
| `/lists` | Signed in | Your lists |
| `/create` | Signed in | New list |
| `/list/[listId]` | Owner | Add/remove items, share |
| `/profile` | Signed in | Account and sign out |
| `/w/[shareId]` | Anyone with the link | View a list and claim gifts, no account needed |

- **Route protection:** [`proxy.ts`](proxy.ts) sends signed-out visitors away from the owner pages.
- **Data access:** [`lib/wishlist-api.ts`](lib/wishlist-api.ts) is the only place that talks to Supabase.
- **Surprise mode:** this is enforced in the database, not the browser.
  - Visitors can't read the `purchases` table directly.
  - `get_shared_list` removes purchase details when the list's owner is the one viewing.
  - `claim_item` allows one claim per item and returns a secret token. The gifter's browser keeps it in `localStorage`, and `unclaim_item` only undoes a claim with that token.

## Known gaps

- **Product links:** the link preview in [`utils/linkPreview.ts`](utils/linkPreview.ts) is simulated. It matches a few sample products and doesn't fetch real titles, prices or images.
- **Share link domain:** share links are built with a hard-coded `wishlisted.app` domain in [`components/ShareSheet.tsx`](components/ShareSheet.tsx).
