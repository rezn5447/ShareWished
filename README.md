# Gimme

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
| `NEXT_PUBLIC_SITE_URL` | Optional. Domain used in share links, e.g. `https://www.sharewished.app`. Defaults to the domain the app is opened on. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional. Inbox behind **Help & feedback** on the profile page. Leave unset to hide that row. |

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

## Tests

End-to-end tests use [Playwright](https://playwright.dev) and run against your Clerk development instance and Supabase project:

```bash
npx playwright install chromium   # once
npm run test:e2e
```

They create their own test user and clean up after themselves. Details are in [`e2e/README.md`](e2e/README.md).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), choose **Add New → Project** and import the repo. Vercel detects Next.js, so the default build settings are correct.
3. Before the first deploy, add the four variables from step 2 under **Environment Variables**. Add `NEXT_PUBLIC_SITE_URL` too if you use a custom domain, and `NEXT_PUBLIC_SUPPORT_EMAIL` to show the help link.
4. Click **Deploy**. Every push to `main` deploys to production after that, and every other branch gets a preview URL.

`NEXT_PUBLIC_*` variables are baked in at build time. After changing one, redeploy (**Deployments → ⋯ → Redeploy**).

### Clerk in production

- **Development keys (`pk_test_` / `sk_test_`)** work on any domain, `*.vercel.app` included. Clerk shows a small "Development mode" badge and caps you at 100 users. That's fine for testing with friends.
- **Production keys (`pk_live_` / `sk_live_`)** need a domain you own. Clerk can't use `*.vercel.app` for production. To switch:
  1. Add your domain in Vercel (**Settings → Domains**).
  2. In Clerk, create the production instance for that domain and add the DNS records it lists.
  3. Replace the two Clerk variables in Vercel with the live keys, then redeploy.
  4. Production is a separate Clerk instance with its own domain. Repeat [step 3](#3-connect-clerk-to-supabase) with it, so Supabase trusts its sessions.

  Test users and their sign-ins stay in the development instance.

## Test data

`npm run seed` creates five connected test users: Maya, Jordan, Priya, Theo and Ben. Each has a list, and they've claimed gifts on each other's lists. The script:

1. Creates the users in Clerk with `+clerk_test` emails. It refuses to run unless `CLERK_SECRET_KEY` is a development (`sk_test_`) key. Users that already exist are reused.
2. Writes `supabase/seed.generated.sql`. Paste it into the Supabase **SQL Editor** and run it.

Sign in as any of them with their email (e.g. `maya+clerk_test@example.com`) and the code **424242**. Clerk development instances accept that code for `+clerk_test` addresses, so no inbox is needed.

| User | List(s) | What it's good for testing |
| --- | --- | --- |
| Maya | 30th Birthday | Some items claimed, some not |
| Jordan | Wedding Registry | Mostly claimed |
| Priya | New Apartment | An item with no price |
| Theo | Baby Shower | Everything claimed ("Everything's covered") |
| Ben | Holiday Wishlist, Just Because | Nothing claimed yet, plus an empty list |

Share links follow the pattern `/w/<name>-<list-title>-seed`, e.g. `/w/maya-30th-birthday-seed`.

Seeded claims have no undo token in anyone's browser, so they can't be undone from the app. Claims you make while testing can be.

Re-running the SQL replaces earlier seed data. Every list whose share id ends in `-seed` is deleted and recreated, and other lists are left alone.

## How it fits together

| Route | Who | What |
| --- | --- | --- |
| `/` | Everyone | Sign in / sign up |
| `/lists` | Signed in | Your lists |
| `/create` | Signed in | New list |
| `/list/[listId]` | Owner | Add, edit and remove items; edit or delete the list; share |
| `/profile` | Signed in | Account, privacy, help and sign out |
| `/privacy` | Everyone | How surprise mode works and who can open a list |
| `/w/[shareId]` | Anyone with the link | View a list and claim gifts, no account needed |

- **Route protection:** [`proxy.ts`](proxy.ts) sends signed-out visitors away from the owner pages.
- **Data access:** [`lib/wishlist-api.ts`](lib/wishlist-api.ts) is the only place that talks to Supabase.
- **Surprise mode:** this is enforced in the database, not the browser.
  - Visitors can't read the `purchases` table directly.
  - `get_shared_list` removes purchase details when the list's owner is the one viewing.
  - `claim_item` allows one claim per item and returns a secret token. The gifter's browser keeps it in `localStorage`, and `unclaim_item` only undoes a claim with that token.

## Known gaps

- **Product links:** [`app/api/link-preview`](app/api/link-preview/route.ts) reads a page's product details: schema.org product data, then Open Graph tags, then the page title. Shops that block bots, Amazon included, fall back to a name read from the link itself, and the price has to be typed in.
