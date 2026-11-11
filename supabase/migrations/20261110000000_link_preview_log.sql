-- One row per link preview the app serves, so we can measure how often the
-- link reader fills an item in on its own (the baseline before any AI work).
--
--  * The server inserts the row when it answers /api/link-preview, as the
--    signed-in owner (their Clerk token, so RLS applies like everywhere else).
--  * When that preview turns into a saved item, the browser fills in item_id
--    and what was actually saved. Comparing those with what the reader
--    returned tells us whether the person had to fix the name or type a price.
--  * Rows go with their item (on delete cascade), matching the privacy page:
--    removing an item removes what we know about it.
--
-- Additive and re-runnable. Touches no existing table, policy or grant.

create table if not exists public.link_previews (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default (auth.jwt() ->> 'sub'),
  -- The link as pasted, and where it ended up after redirects (a.co/… → amazon.com/…).
  url text not null,
  resolved_url text not null,
  retailer text not null,
  source text not null check (source in ('page', 'link')),
  -- What the preview returned, and where each field came from.
  title text not null,
  price numeric not null default 0,
  image text not null,
  title_from text not null check (title_from in ('page', 'shopify', 'link', 'none')),
  price_from text not null check (price_from in ('page', 'shopify', 'link', 'none')),
  image_from text not null check (image_from in ('page', 'shopify', 'link', 'none')),
  created_at timestamptz not null default now(),
  -- Filled in when the preview is saved as an item. filled_title is what the
  -- form showed, which can come from a shop's share text rather than the server.
  item_id uuid unique references public.wishlist_items (id) on delete cascade,
  filled_title text,
  saved_title text,
  saved_price numeric,
  saved_at timestamptz
);

-- RLS filters on owner_id for every query.
create index if not exists link_previews_owner_id_idx on public.link_previews (owner_id);

alter table public.link_previews enable row level security;

revoke all on public.link_previews from anon, authenticated;
grant select, insert, delete on public.link_previews to authenticated;
-- After insert, only the "what was saved" columns may change.
grant update (item_id, filled_title, saved_title, saved_price, saved_at)
  on public.link_previews to authenticated;

drop policy if exists "Owners manage their link previews" on public.link_previews;
create policy "Owners manage their link previews"
  on public.link_previews
  for all
  to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'))
  with check (
    owner_id = (select auth.jwt() ->> 'sub')
    -- Foreign keys skip RLS, so check the item is on one of the caller's lists.
    and (
      item_id is null
      or exists (
        select 1
        from public.wishlist_items i
        join public.wishlists w on w.id = i.wishlist_id
        where i.id = item_id
          and w.owner_id = (select auth.jwt() ->> 'sub')
      )
    )
  );
