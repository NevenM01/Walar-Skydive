create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text,
  consent_version text not null
);

alter table public.cookie_consents enable row level security;

create index if not exists cookie_consents_user_id_idx on public.cookie_consents (user_id);
create index if not exists cookie_consents_anonymous_id_idx on public.cookie_consents (anonymous_id);
create index if not exists cookie_consents_created_at_idx on public.cookie_consents (created_at desc);

drop policy if exists "cookie_consents_insert_any" on public.cookie_consents;
drop policy if exists "cookie_consents_select_admin" on public.cookie_consents;

create policy "cookie_consents_insert_any"
  on public.cookie_consents
  for insert
  to anon, authenticated
  with check (true);

create policy "cookie_consents_select_admin"
  on public.cookie_consents
  for select
  to authenticated
  using (public.jwt_is_app_admin());

