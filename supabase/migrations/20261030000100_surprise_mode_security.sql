-- Enforces surprise mode in the database instead of trusting the client.
--
--  * Owners (signed-in via Clerk) can only read/write their own lists and items.
--  * Nobody can touch `purchases` directly. Gifters go through three
--    security-definer functions:
--      get_shared_list  — public view of a list by share id; purchases are
--                         stripped when the caller is the list's owner.
--      claim_item       — one claim per item (unique item_id); returns a
--                         secret claim token the gifter's browser keeps.
--      unclaim_item     — undo, only with that claim token.
--  * Anonymous visitors can no longer select from the tables, so lists can't
--    be enumerated — only opened by their share id.

-- ---------------------------------------------------------------------------
-- Purchases: claim token + guaranteed one claim per item
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column if not exists claim_token uuid not null default gen_random_uuid();

-- No-op if the unique constraint from the baseline already exists.
create unique index if not exists purchases_item_id_key
  on public.purchases (item_id);

-- ---------------------------------------------------------------------------
-- Reset policies so this file is the single source of truth
-- ---------------------------------------------------------------------------

do $$
declare
  policy record;
begin
  for policy in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('wishlists', 'wishlist_items', 'purchases')
  loop
    execute format('drop policy %I on public.%I', policy.policyname, policy.tablename);
  end loop;
end
$$;

alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.purchases enable row level security;

revoke all on public.wishlists from anon;
revoke all on public.wishlist_items from anon;
revoke all on public.purchases from anon, authenticated;

grant select, insert, update, delete on public.wishlists to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;

-- ---------------------------------------------------------------------------
-- Owner policies
-- ---------------------------------------------------------------------------

create policy "Owners manage their lists"
  on public.wishlists
  for all
  to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'))
  with check (owner_id = (select auth.jwt() ->> 'sub'));

create policy "Owners manage items on their lists"
  on public.wishlist_items
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_id
        and w.owner_id = (select auth.jwt() ->> 'sub')
    )
  )
  with check (
    exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_id
        and w.owner_id = (select auth.jwt() ->> 'sub')
    )
  );

-- ---------------------------------------------------------------------------
-- Gifter functions
-- ---------------------------------------------------------------------------

create or replace function public.get_shared_list(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_list public.wishlists;
  v_is_owner boolean;
begin
  select * into v_list from public.wishlists where share_id = p_share_id;
  if not found then
    return null;
  end if;

  v_is_owner := coalesce(v_list.owner_id = (auth.jwt() ->> 'sub'), false);

  return jsonb_build_object(
    'list', to_jsonb(v_list),
    'is_owner', v_is_owner,
    'items', coalesce(
      (
        select jsonb_agg(
          to_jsonb(i) || jsonb_build_object(
            'purchase',
            case
              when v_is_owner or p.id is null then null
              else jsonb_build_object(
                'gifter_name', p.gifter_name,
                'purchased_at', p.purchased_at
              )
            end
          )
          order by i.added_at desc
        )
        from public.wishlist_items i
        left join public.purchases p on p.item_id = i.id
        where i.wishlist_id = v_list.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.claim_item(p_item_id uuid, p_gifter_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner_id text;
  v_name text := btrim(p_gifter_name);
  v_token uuid;
begin
  if v_name is null or length(v_name) = 0 or length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;

  select w.owner_id into v_owner_id
  from public.wishlist_items i
  join public.wishlists w on w.id = i.wishlist_id
  where i.id = p_item_id;

  if not found then
    raise exception 'item_not_found';
  end if;
  if v_owner_id = (auth.jwt() ->> 'sub') then
    raise exception 'own_list';
  end if;

  insert into public.purchases (item_id, gifter_name)
  values (p_item_id, v_name)
  on conflict (item_id) do nothing
  returning claim_token into v_token;

  if v_token is null then
    raise exception 'already_claimed';
  end if;

  return v_token;
end;
$$;

create or replace function public.unclaim_item(p_item_id uuid, p_claim_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.purchases
  where item_id = p_item_id
    and claim_token = p_claim_token;
  return found;
end;
$$;

revoke all on function public.get_shared_list(text) from public;
revoke all on function public.claim_item(uuid, text) from public;
revoke all on function public.unclaim_item(uuid, uuid) from public;

grant execute on function public.get_shared_list(text) to anon, authenticated;
grant execute on function public.claim_item(uuid, text) to anon, authenticated;
grant execute on function public.unclaim_item(uuid, uuid) to anon, authenticated;
