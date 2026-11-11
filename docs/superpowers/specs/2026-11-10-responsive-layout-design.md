# Responsive layout for laptop and desktop screens

Date: 2026-11-10
Status: design approved in conversation, awaiting spec review

## Why

Every Gimme screen is a 448px phone column centered on the page, with a fixed bottom nav and bottom sheets. On a laptop it looks like a phone floating in the middle of the window. The holiday user group starts Nov 16–22, and people often shop on a laptop: that's where they copy product links into a list. Friends who get a share link by email or chat often open it on a computer too.

Priority, as agreed: owners first (adding items from a laptop), gifters second (the shared list).

## Goals and non-goals

Goals:

- From 768px wide up, every screen uses the extra width deliberately: a top nav, a wide item grid, centered dialogs.
- Below 768px, nothing changes. The phone layout stays the primary design.
- One set of components. No separate desktop pages.

Non-goals:

- New features or content. Desktop shows the same things the phone does.
- A new landing page design. It stays a narrow centered column.
- Tablet-specific layouts beyond what the breakpoints give.

## Breakpoints

Tailwind defaults, no config change:

- below `md` (under 768px): today's phone layout, untouched
- `md` (768px and up): top nav, centered dialogs, 2-column grids
- `lg` (1024px and up): 3-column grids

## Design

### 1. Screen shell

`components/MobileScreen.tsx` becomes `components/Screen.tsx`, and every page moves to it.

- Props: `children`, `padBottom` (as today), `width: 'wide' | 'narrow'` (default `'narrow'`).
- Below `md`: renders exactly what `MobileScreen` renders today (the `max-w-md` cream column on the `#F1E9DE` backdrop).
- At `md` and up: the column grows to `max-w-6xl` for `wide` (about 1100px of content with padding) or `max-w-xl` (576px) for `narrow`. The page background becomes cream edge to edge and the column drops its side shadow.
- `padBottom` only applies below `md`, since there's no bottom nav or bottom bar at desktop width.

The landing page, sign-in and sign-up keep `padBottom={false}` and get `narrow`.

### 2. Navigation

- New `components/TopNav.tsx`, shown only at `md` and up (`hidden md:flex`): the Gimme wordmark linking to `/lists`, then "Lists" and "New list", then a "You" link to `/profile` on the right. The active link uses the accent color, as `BottomNav` does. It is sticky at the top.
- `BottomNav` gets `md:hidden`.
- The pages that render `BottomNav` today render `TopNav` too (signed-in screens only: lists, list page, create, profile).
- `TopBar` (back button + title): below `md`, unchanged. At `md` and up it is no longer sticky (`md:static`), drops its bottom border and backdrop, and left-aligns the title, so it reads as a page header under `TopNav`.

### 3. Dialogs

`components/Sheet.tsx` stays the single component behind Add item, Edit item, Edit list, Claim and Share.

- Below `md`: unchanged, sliding up from the bottom with a spring.
- At `md` and up: a centered dialog, `max-w-lg` (512px), rounded on all corners, vertically centered with a scrim. It animates with a fade plus a slight scale (0.96 to 1) instead of the slide.
- A new `lib/use-media-query.ts` hook (`useMediaQuery('(min-width: 768px)')`) picks the animation variants. It returns `false` on the server and before mount, so the first paint matches the phone layout and the dialog never opens before mount anyway.
- Escape-to-close, the scrim close button and the `role="dialog"` / `aria-label` stay as they are, so the existing e2e selectors keep working.

### 4. Screens

| Screen | File | At `md` and up |
|---|---|---|
| List page (owner) | `app/list/[listId]/page.tsx` | `wide`. Banner across the top: emoji, title, occasion, date, item count and total, with Edit and Share buttons on the right. "Items" heading with "+ Add item" below it, then the item grid: 2 columns at `md`, 3 at `lg`. The fixed bottom "Share list" bar gets `md:hidden`. The surprise-mode note sits under the banner. |
| Shared list (gifters) | `app/w/[shareId]/SharedListView.tsx` | `wide`. Same banner (without Edit and Share) and the same grid. The "Still available / All" filter sits above the grid. The toast stays bottom-center. |
| Item card | `components/ItemCard.tsx` | Vertical card: the photo fills the top (square-ish, `aspect-[4/3]`), with title, price, shop and actions below. Below `md` it keeps today's horizontal row. Same props, same accessible names. |
| Your lists | `app/lists/page.tsx` | `wide`. Greeting header, then list cards in a grid (2 columns at `md`, 3 at `lg`), with "New list" as the last tile. The "Your lists stay a surprise" panel spans the full width below. |
| New list | `app/create/page.tsx` | `narrow`. |
| Profile | `app/profile/page.tsx` | `narrow`. |
| Privacy, terms | `app/privacy/page.tsx`, `app/terms/page.tsx` | `narrow`. |
| Sign-in, sign-up | `app/sign-in/...`, `app/sign-up/...` | `narrow`. |
| Landing | `app/page.tsx` | `narrow`. No nav. Content unchanged. |

### 5. What does not change

- Data access, routes, auth and surprise mode. This is layout only.
- Any copy, except where a desktop header needs a visible page title that the phone shows in `TopBar` (it already does).
- The phone layout. Every `md:` and `lg:` class is additive.

## Testing

- New Playwright project `desktop-chrome` (`devices['Desktop Chrome']`, 1280×800) in `playwright.config.ts`. It runs only `e2e/desktop.spec.ts`. The existing `mobile-chrome` project ignores that file, so every current spec keeps running at phone size.
- `e2e/desktop.spec.ts` checks, at desktop size:
  1. Signed-in screens show `TopNav` and hide `BottomNav`.
  2. The list page lays items out in more than one column (two item cards share a top offset).
  3. "Add item" opens a dialog that is horizontally centered and not attached to the bottom edge, and saving an item works.
  4. A signed-out friend on the shared list can claim an item through the centered dialog.
- The fixtures' `ownerPage` and `newVisitor` open phone contexts today. They take the test's project `viewport` instead, so the same fixtures serve both projects.
- Manual check: screenshots of every screen at 390px and 1280px, looked at before calling it done.
- Before done: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the full e2e suite in a clean shell.

## Delivery

- Branch `feat/responsive-layout` from `main`, its own pull request.
- It overlaps `feat/link-preview-logging` in `app/list/[listId]/page.tsx` and around `ItemSheet`. Whichever merges second rebases; the overlaps are small.

## Open questions

None at this point.
