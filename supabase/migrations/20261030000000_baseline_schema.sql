-- Baseline schema for Wishlisted, reconstructed from lib/supabase/database.types.ts.
-- Written with `if not exists` so it is a no-op against the existing project
-- and creates the same tables on a fresh one.

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  -- Clerk user id, taken from the Supabase third-party-auth JWT.
  owner_id text not null default (auth.jwt() ->> 'sub'),
  owner_name text not null,
  title text not null,
  occasion text not null,
  event_date date,
  note text,
  cover text not null check (
    cover in ('birthday', 'wedding', 'home', 'baby', 'holiday', 'just-because')
  ),
  share_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  title text not null,
  url text not null,
  retailer text not null,
  image text not null,
  price numeric not null default 0,
  note text,
  priority text not null check (priority in ('low', 'normal', 'must')),
  added_at timestamptz not null default now()
);

create index if not exists wishlist_items_wishlist_id_idx
  on public.wishlist_items (wishlist_id);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.wishlist_items (id) on delete cascade,
  gifter_name text not null,
  purchased_at timestamptz not null default now()
);
