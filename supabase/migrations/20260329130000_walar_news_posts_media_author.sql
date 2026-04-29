-- News byline, image URLs, and public Storage bucket for uploads.

alter table public.walar_news_posts
  add column if not exists author_name text not null default '';

alter table public.walar_news_posts
  add column if not exists image_urls text[] not null default array[]::text[];

comment on column public.walar_news_posts.author_name is 'Byline on /news cards.';
comment on column public.walar_news_posts.image_urls is 'Public URLs; first is card cover, rest optional gallery.';

-- ---------------------------------------------------------------------------
-- Storage: news images (public read; admin write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "news_images_select_public" on storage.objects;
drop policy if exists "news_images_insert_admin" on storage.objects;
drop policy if exists "news_images_update_admin" on storage.objects;
drop policy if exists "news_images_delete_admin" on storage.objects;

create policy "news_images_select_public"
  on storage.objects
  for select
  using (bucket_id = 'news-images');

create policy "news_images_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and public.jwt_is_app_admin()
  );

create policy "news_images_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'news-images'
    and public.jwt_is_app_admin()
  );

create policy "news_images_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'news-images'
    and public.jwt_is_app_admin()
  );
