-- Partners & supporters for /partners and home teaser; admins manage via RLS (jwt_is_app_admin).

create table public.walar_project_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  kind text not null check (kind in ('sponsor', 'advertiser', 'supporter')),
  tagline text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index walar_project_partners_sort_idx
  on public.walar_project_partners (kind, sort_order asc, name asc);

comment on table public.walar_project_partners is 'Public partner/supporter listings; kind supporter vs sponsor/advertiser for section grouping.';

alter table public.walar_project_partners enable row level security;

create policy "walar_project_partners_select_public"
  on public.walar_project_partners
  for select
  using (true);

create policy "walar_project_partners_insert_admin"
  on public.walar_project_partners
  for insert
  with check (public.jwt_is_app_admin());

create policy "walar_project_partners_update_admin"
  on public.walar_project_partners
  for update
  using (public.jwt_is_app_admin());

create policy "walar_project_partners_delete_admin"
  on public.walar_project_partners
  for delete
  using (public.jwt_is_app_admin());

grant select on public.walar_project_partners to anon, authenticated;
grant select, insert, update, delete on public.walar_project_partners to authenticated;
