-- Public inquiries from organizations interested in partnering with WALAR.
-- Inserts are open to anon (with column checks); reads are admin-only.

create table if not exists public.walar_partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  organization_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  message text
);

create index if not exists walar_partner_inquiries_created_at_idx
  on public.walar_partner_inquiries (created_at desc);

comment on table public.walar_partner_inquiries is 'Inbound partner / sponsorship interest from the public Become a partner form.';

alter table public.walar_partner_inquiries enable row level security;

grant insert on table public.walar_partner_inquiries to anon, authenticated;
grant select on table public.walar_partner_inquiries to authenticated;

drop policy if exists "wpi_insert_public" on public.walar_partner_inquiries;
create policy "wpi_insert_public"
  on public.walar_partner_inquiries
  for insert
  to anon, authenticated
  with check (
    length(trim(organization_name)) between 1 and 200
    and length(trim(contact_name)) between 1 and 200
    and length(trim(email)) between 3 and 320
    and (phone is null or length(trim(phone)) <= 60)
    and (message is null or length(message) <= 4000)
  );

drop policy if exists "wpi_admin_select" on public.walar_partner_inquiries;
create policy "wpi_admin_select"
  on public.walar_partner_inquiries
  for select
  to authenticated
  using (public.jwt_is_app_admin());

drop policy if exists "wpi_admin_delete" on public.walar_partner_inquiries;
create policy "wpi_admin_delete"
  on public.walar_partner_inquiries
  for delete
  to authenticated
  using (public.jwt_is_app_admin());
