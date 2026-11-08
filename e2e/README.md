# End-to-end tests

Playwright tests that drive the real app in a phone-sized Chrome, against the
Clerk development instance and Supabase project in `.env.local`.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # builds, starts on :3100, runs everything
npm run test:e2e:ui               # same, in Playwright's UI mode
E2E_DEV=1 npm run test:e2e        # use `next dev` instead of a build (faster start, slower tests)
E2E_BASE_URL=https://… npm run test:e2e   # run against an already running deployment
```

## What it needs

- `.env.local` with the Clerk and Supabase keys. `CLERK_SECRET_KEY` must be a
  development (`sk_test_`) key; the tests refuse to run otherwise.
- Clerk connected to Supabase (README step 3) and the migrations applied.
- No seed data. Tests don't use `npm run seed`.

## How it works

- **Test user.** `global-setup.ts` creates `e2e-owner+clerk_test@example.com`
  (Erin Endtoend) in Clerk the first time. It is kept apart from the seed
  friends, so tests never change their lists.
- **Signing in.** `auth.setup.ts` signs in once with a Clerk sign-in token
  and saves the browser state to `e2e/.auth/` (gitignored). `sign-in.spec.ts`
  separately goes through the real form with code `424242`.
- **Test data.** Tests make their own lists through the UI or `lists.create()`
  (`support/fixtures.ts`), and every list is deleted when the test ends.
  Global setup also deletes e2e lists over an hour old, left by a crashed run.
  Runs can overlap safely.
- **Database checks.** `support/db.ts` gets real Supabase clients: anonymous,
  and signed in as the test user through a Clerk backend session. Surprise mode
  is then checked where it's enforced, not only in the UI.

## Specs

| File | Covers |
| --- | --- |
| `public.spec.ts` | Landing page, protected routes redirect, link previews need sign-in, broken share link |
| `sign-in.spec.ts` | Email-code sign-in through the real form, sign out |
| `owner.spec.ts` | Create a list, add/remove items, link-preview autofill, validation, share sheet |
| `surprise-mode.spec.ts` | Claim, undo, race for the same gift, "everything's covered", owner never sees claims (UI, page HTML and database) |
| `link-preview.spec.ts` | The preview API won't read localhost, private or metadata addresses |

If you change `get_shared_list`, `claim_item`, `unclaim_item`, grants or
policies, run `surprise-mode.spec.ts` before shipping.
