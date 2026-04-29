-- Full article text for news posts (list still uses excerpt).

alter table public.walar_news_posts
  add column if not exists body text not null default '';

comment on column public.walar_news_posts.body is 'Full article body; excerpt remains the card/list summary.';
