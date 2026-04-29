-- Legacy post title was in Croatian; app UI is English.
update public.walar_news_posts
set
  title = 'Walar Skydive — all information in one place',
  updated_at = now()
where title ~* 'sve informacije'
  and title ~* 'jednom mjestu';
