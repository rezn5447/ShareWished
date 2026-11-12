-- Photos owners upload for their items, in Supabase Storage.
--
--  * Public bucket: items (and their `image` URL) are already shown to anyone
--    with the share link, so reading an image needs no session. Object names
--    are random, so the bucket can't be browsed; listing needs the SELECT
--    policy below, which only covers your own folder.
--  * The browser shrinks photos to about 500px before upload (items show at
--    80px or less). The 1MB limit and type list are the server-side backstop.
--  * Each owner writes only under `<clerk user id>/`. The id comes from
--    `auth.jwt() ->> 'sub'` (a Clerk id string), never `auth.uid()` or the
--    `owner` column, which don't work with Clerk tokens.
--  * Uploads never overwrite (no UPDATE policy), so no upsert. remove() needs
--    SELECT as well as DELETE, or it quietly removes nothing.
--
-- Additive and re-runnable. Touches no existing table, policy or grant.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload item images" on storage.objects;
drop policy if exists "Owners see their item images" on storage.objects;
drop policy if exists "Owners delete their item images" on storage.objects;

create policy "Owners upload item images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "Owners see their item images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "Owners delete their item images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
