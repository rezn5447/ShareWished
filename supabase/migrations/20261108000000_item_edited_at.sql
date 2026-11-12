-- Marks items whose details changed after they were added, so gifters know to
-- look again before buying (and owners can see which ones they touched).
--
-- The database sets edited_at, not the client: a save that changes nothing
-- doesn't count, and nobody can forge or clear the mark through the API.
-- Priority is left out on purpose: it changes how much the owner wants the
-- item, not what the item is.
--
-- get_shared_list returns to_jsonb(i), so gifters receive the column without
-- any change to the surprise-mode functions.

alter table public.wishlist_items
  add column if not exists edited_at timestamptz;

create or replace function public.set_item_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.edited_at := null;
  elsif (new.title, new.url, new.retailer, new.image, new.price, new.note)
        is distinct from
        (old.title, old.url, old.retailer, old.image, old.price, old.note) then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

revoke all on function public.set_item_edited_at() from public, anon, authenticated;

drop trigger if exists wishlist_items_set_edited_at on public.wishlist_items;
create trigger wishlist_items_set_edited_at
  before insert or update on public.wishlist_items
  for each row
  execute function public.set_item_edited_at();
