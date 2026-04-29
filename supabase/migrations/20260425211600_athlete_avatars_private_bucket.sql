-- Make athlete-avatars bucket private (use signed URLs).
-- NOTE: bucket row already created in 20260416131000_athlete_avatar_url_storage.sql.

update storage.buckets
set public = false
where id = 'athlete-avatars';

-- Remove public select policy.
drop policy if exists "athlete_avatars_select_public" on storage.objects;

-- Allow only owner to manage their own objects; viewing is via signed URLs.
drop policy if exists "athlete_avatars_select_own" on storage.objects;
create policy "athlete_avatars_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'athlete-avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

