-- WALAR MVP — initial schema (competitions + profiles for future admin RLS)
-- Apply via Supabase Dashboard → SQL, or: supabase db push (CLI linked to project)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; is_admin set manually in SQL until admin UI)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  role text not null default 'athlete'
    check (role in ('admin', 'organizer', 'athlete')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App profile; row created on signup via trigger.';

-- New auth users get a profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_admin, role)
  values (new.id, false, 'athlete')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Competitions (public read; admin write)
-- ---------------------------------------------------------------------------
create type public.competition_status as enum (
  'upcoming',
  'ongoing',
  'completed',
  'results_published'
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  location text not null,
  category text not null default 'Open',
  status public.competition_status not null default 'upcoming',
  fai_class text,
  description text,
  organizer_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_date_range check (end_date >= start_date)
);

create index competitions_start_date_desc_idx on public.competitions (start_date desc);

comment on column public.competitions.organizer_user_id is 'V2: optional owner; MVP unused.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.competitions enable row level security;

-- Profiles: read own row, or admins read any (for future admin screens)
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- Competitions: public catalog
create policy "competitions_select_public"
  on public.competitions
  for select
  using (true);

create policy "competitions_insert_admin"
  on public.competitions
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "competitions_update_admin"
  on public.competitions
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "competitions_delete_admin"
  on public.competitions
  for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- Optional demo rows (remove in production if undesired)
-- ---------------------------------------------------------------------------
insert into public.competitions (
  id, name, start_date, end_date, location, category, status, fai_class, description
) values
  (
    'c0000001-0000-4000-8000-000000000001',
    'WALAR Cup — Grobnik 2025',
    '2025-05-10',
    '2025-05-11',
    'Grobnik, Croatia',
    'Open',
    'results_published',
    'CL',
    'Two-day Accuracy Landing championship at Grobnik airfield.'
  ),
  (
    'c0000002-0000-4000-8000-000000000002',
    'Memorial — Zadar',
    '2025-06-21',
    '2025-06-22',
    'Zadar, Croatia',
    'National',
    'upcoming',
    'CL',
    null
  ),
  (
    'c0000003-0000-4000-8000-000000000003',
    'Winter training camp',
    '2025-02-01',
    '2025-02-02',
    'Sinj, Croatia',
    'Training',
    'completed',
    null,
    null
  ),
  (
    'c0000004-0000-4000-8000-000000000004',
    'Balkan Open',
    '2025-08-15',
    '2025-08-17',
    'Osijek, Croatia',
    'Open',
    'ongoing',
    'CL',
    null
  )
on conflict (id) do nothing;
