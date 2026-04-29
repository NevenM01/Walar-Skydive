-- Public profile photo: URL on athletes + Storage bucket scoped by auth user id (first path segment).

alter table public.athletes
  add column if not exists avatar_url text;

comment on column public.athletes.avatar_url is
  'Public URL of profile photo (Supabase Storage bucket athlete-avatars).';

insert into storage.buckets (id, name, public)
values ('athlete-avatars', 'athlete-avatars', true)
on conflict (id) do nothing;

drop policy if exists "athlete_avatars_select_public" on storage.objects;
create policy "athlete_avatars_select_public"
  on storage.objects
  for select
  using (bucket_id = 'athlete-avatars');

drop policy if exists "athlete_avatars_insert_own" on storage.objects;
create policy "athlete_avatars_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'athlete-avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "athlete_avatars_update_own" on storage.objects;
create policy "athlete_avatars_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'athlete-avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "athlete_avatars_delete_own" on storage.objects;
create policy "athlete_avatars_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'athlete-avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
