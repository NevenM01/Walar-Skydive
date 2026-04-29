-- Profile edit access requests (no public sign-up).
-- Users submit a request; admins approve by linking an auth user to an athlete (athletes.user_id).

create table if not exists public.athlete_profile_edit_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  status text not null default 'pending'
    constraint athlete_profile_edit_requests_status_chk
    check (status in ('pending', 'approved', 'rejected')),

  email text not null,

  -- Optional: direct athlete selection by the requester
  athlete_id uuid null references public.athletes(id) on delete set null,
  athlete_search_text text null,

  -- Optional: manual identification fields if the athlete is not found
  manual_full_name text null,
  manual_country_code text null,
  manual_fai_licence text null,
  manual_year_of_birth int null,

  message text null,

  -- Resolution/audit
  approved_at timestamptz null,
  approved_by uuid null,
  rejected_at timestamptz null,
  rejected_by uuid null,
  rejection_reason text null,

  linked_user_id uuid null,
  resolved_athlete_id uuid null references public.athletes(id) on delete set null
);

create index if not exists athlete_profile_edit_requests_status_created_at_idx
  on public.athlete_profile_edit_requests (status, created_at desc);

create index if not exists athlete_profile_edit_requests_email_created_at_idx
  on public.athlete_profile_edit_requests (email, created_at desc);

alter table public.athlete_profile_edit_requests enable row level security;

-- Grants (RLS still applies to anon/authenticated).
grant insert on table public.athlete_profile_edit_requests to anon, authenticated;
grant select, update, delete on table public.athlete_profile_edit_requests to authenticated;

drop policy if exists "apr_insert_request" on public.athlete_profile_edit_requests;
create policy "apr_insert_request"
  on public.athlete_profile_edit_requests
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "apr_admin_select" on public.athlete_profile_edit_requests;
create policy "apr_admin_select"
  on public.athlete_profile_edit_requests
  for select
  to authenticated
  using (public.jwt_is_app_admin());

drop policy if exists "apr_admin_update" on public.athlete_profile_edit_requests;
create policy "apr_admin_update"
  on public.athlete_profile_edit_requests
  for update
  to authenticated
  using (public.jwt_is_app_admin())
  with check (public.jwt_is_app_admin());

drop policy if exists "apr_admin_delete" on public.athlete_profile_edit_requests;
create policy "apr_admin_delete"
  on public.athlete_profile_edit_requests
  for delete
  to authenticated
  using (public.jwt_is_app_admin());

