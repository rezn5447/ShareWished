-- Usage numbers for the holiday user group and the link-reader baseline.
-- Run in the Supabase SQL editor (it runs as the postgres role, so it sees
-- every owner's rows). Totals only: nothing here says which items are claimed
-- or by whom, so it's safe to show anyone. Never turn this into an in-app
-- page or an RPC; `purchases` must stay unreachable from the API.
--
-- e2e lists (share ids starting "e2e-") are left out; the tests delete their
-- own rows, but a crashed run can leave some behind for up to an hour.

-- 1. Totals
with lists as (
  select * from public.wishlists where share_id not like 'e2e-%'
),
items as (
  select i.* from public.wishlist_items i join lists l on l.id = i.wishlist_id
)
select
  (select count(distinct owner_id) from lists) as owners_with_a_list,
  (select count(*) from lists) as wishlists,
  (select count(*) from items) as items,
  (select count(*) from public.purchases p join items i on i.id = p.item_id) as gifts_claimed,
  (select count(*) from public.link_previews) as link_lookups;

-- 2. Link-reader baseline, per shop: how often a pasted link came back
-- complete, and how often the person had to fix the name or type the price.
-- "Complete" = name and price read from the shop (page or Shopify data), not
-- guessed from the link. Only lookups that became an item count, so stray
-- pastes don't skew it.
--
-- Most lookups are tied to their item when it's saved (item_id). If someone
-- saved before a slow lookup came back, the row has no item_id; those are
-- matched to the item by owner and link instead, using what the item holds.
-- Slow lookups are mostly blocked shops, the ones this baseline is about.
with items as (
  select i.*, w.owner_id
  from public.wishlist_items i
  join public.wishlists w on w.id = i.wishlist_id
  where w.share_id not like 'e2e-%'
),
outcomes as (
  select lp.retailer, lp.title_from, lp.price_from, lp.price,
         lp.filled_title, lp.saved_title, lp.saved_price, i.id as item_id
  from public.link_previews lp
  join items i on i.id = lp.item_id
  union all
  (select distinct on (i.id)
         lp.retailer, lp.title_from, lp.price_from, lp.price,
         null, i.title, i.price, i.id
  from public.link_previews lp
  join items i
    on i.owner_id = lp.owner_id
   and i.url = lp.url
   and i.added_at between lp.created_at - interval '2 minutes' and lp.created_at + interval '10 minutes'
  where lp.item_id is null
    and not exists (select 1 from public.link_previews x where x.item_id = i.id)
  order by i.id, lp.created_at desc)
)
select
  coalesce(retailer, 'all shops') as shop,
  count(*) as items_from_a_lookup,
  round(100.0 * avg((title_from in ('page', 'shopify')
                     and price_from in ('page', 'shopify'))::int), 0) as pct_complete,
  round(100.0 * avg((title_from = 'none')::int), 0) as pct_no_name,
  round(100.0 * avg((price_from = 'none')::int), 0) as pct_no_price,
  -- filled_title is null when the item was saved before the lookup came
  -- back: the person typed the name themselves, so it counts as changed.
  round(100.0 * avg((saved_title is distinct from filled_title)::int), 0) as pct_name_changed,
  round(100.0 * avg((price = 0 and saved_price > 0)::int), 0) as pct_price_typed_in
from outcomes
group by rollup (retailer)
order by count(*) desc;

-- 3. Items added with no lookup at all (the link was never checked, or the
-- lookup failed before it could be logged).
select count(*) as items_added_without_a_lookup
from public.wishlist_items i
join public.wishlists w on w.id = i.wishlist_id and w.share_id not like 'e2e-%'
where not exists (select 1 from public.link_previews lp where lp.item_id = i.id)
  and not exists (
    select 1 from public.link_previews lp
    where lp.item_id is null and lp.owner_id = w.owner_id and lp.url = i.url
  );
