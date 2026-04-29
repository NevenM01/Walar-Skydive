-- Prevent one auth user from being linked to multiple athletes.
-- Allows many athletes to remain unlinked (user_id is null).

create unique index if not exists athletes_user_id_unique
  on public.athletes (user_id)
  where user_id is not null;

