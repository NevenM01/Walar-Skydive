-- Public news posts for /news; admins manage via RLS (jwt_is_app_admin).

create table public.walar_news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  category text not null default 'General',
  published_at date not null default (current_date),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index walar_news_posts_published_idx
  on public.walar_news_posts (is_published, published_at desc);

comment on table public.walar_news_posts is 'Site news shown on /news; draft rows have is_published = false.';

alter table public.walar_news_posts enable row level security;

create policy "walar_news_posts_select_published"
  on public.walar_news_posts
  for select
  using (is_published = true);

create policy "walar_news_posts_select_admin"
  on public.walar_news_posts
  for select
  using (public.jwt_is_app_admin());

create policy "walar_news_posts_insert_admin"
  on public.walar_news_posts
  for insert
  with check (public.jwt_is_app_admin());

create policy "walar_news_posts_update_admin"
  on public.walar_news_posts
  for update
  using (public.jwt_is_app_admin());

create policy "walar_news_posts_delete_admin"
  on public.walar_news_posts
  for delete
  using (public.jwt_is_app_admin());
