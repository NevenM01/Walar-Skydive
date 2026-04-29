-- Homepage "Latest news" strip: at most one pinned post (shown with the latest other published post).

alter table public.walar_news_posts
  add column if not exists is_home_priority boolean not null default false;

comment on column public.walar_news_posts.is_home_priority is
  'Pinned for homepage strip; at most one row may be true. Public home only considers published rows.';

-- At most one row with is_home_priority = true (constant index key).
create unique index if not exists walar_news_posts_one_home_priority
  on public.walar_news_posts ((1))
  where (is_home_priority = true);
