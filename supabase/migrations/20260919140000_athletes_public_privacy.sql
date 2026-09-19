-- Restrict public access to athlete personal data.
-- Review this file before applying. Do not run from the agent against the live database.
-- Apply last, after deploying edge functions (including public-athlete-search) and the frontend.

-- ---------------------------------------------------------------------------
-- SELECT policies: own row + admin. Drop blanket public read.
-- ---------------------------------------------------------------------------
drop policy if exists "athletes_select_public" on public.athletes;

drop policy if exists "athletes_select_own" on public.athletes;
create policy "athletes_select_own"
  on public.athletes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "athletes_select_admin" on public.athletes;
create policy "athletes_select_admin"
  on public.athletes
  for select
  to authenticated
  using (public.jwt_is_app_admin());

-- ---------------------------------------------------------------------------
-- Least privilege table grants
-- ---------------------------------------------------------------------------
revoke all on table public.athletes from public;
revoke all on table public.athletes from anon;

revoke truncate, trigger, references on table public.athletes from authenticated;
revoke update on table public.athletes from authenticated;

grant select, insert, delete on table public.athletes to authenticated;
grant update (
  bio,
  club,
  website_url,
  instagram_url,
  facebook_url,
  dob_display_mode,
  gdpr_publish_full_name,
  pending_avatar_path,
  pending_avatar_updated_at,
  updated_at
) on table public.athletes to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs that read athletes: service_role only (edge functions).
-- get_leaderboard stays security invoker; signature unchanged.
-- ---------------------------------------------------------------------------
grant execute on function public.get_leaderboard(text, uuid, int, text, date, date) to service_role;
grant execute on function public.get_leaderboard(text, uuid, int, text, date, date, int, int) to service_role;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date) from public;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date) from anon;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date) from authenticated;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date, int, int) from public;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date, int, int) from anon;
revoke all on function public.get_leaderboard(text, uuid, int, text, date, date, int, int) from authenticated;

grant execute on function public.get_athlete_public_ranking_summary(uuid, int) to service_role;
revoke all on function public.get_athlete_public_ranking_summary(uuid, int) from public;
revoke all on function public.get_athlete_public_ranking_summary(uuid, int) from anon;
revoke all on function public.get_athlete_public_ranking_summary(uuid, int) from authenticated;

-- Homepage linked-profile count without exposing rows.
create or replace function public.count_linked_athlete_profiles()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.athletes
  where user_id is not null;
$$;

comment on function public.count_linked_athlete_profiles() is
  'Public scalar: number of athlete rows with a linked auth user. No PII.';

revoke all on function public.count_linked_athlete_profiles() from public;
grant execute on function public.count_linked_athlete_profiles() to anon, authenticated, service_role;

-- Other PII tables (profiles, cookie_consents, athlete_profile_edit_requests,
-- walar_partner_inquiries) are intentionally unchanged in this migration.

-- ---------------------------------------------------------------------------
-- ROLLBACK (commented — do not run with the forward migration)
-- ---------------------------------------------------------------------------
-- drop function if exists public.count_linked_athlete_profiles();
--
-- grant execute on function public.get_leaderboard(text, uuid, int, text, date, date) to anon, authenticated;
-- grant execute on function public.get_leaderboard(text, uuid, int, text, date, date, int, int) to anon, authenticated;
-- grant execute on function public.get_athlete_public_ranking_summary(uuid, int) to anon, authenticated;
--
-- grant all on table public.athletes to anon;
-- grant all on table public.athletes to authenticated;
-- revoke update (
--   bio, club, website_url, instagram_url, facebook_url,
--   dob_display_mode, gdpr_publish_full_name,
--   pending_avatar_path, pending_avatar_updated_at, updated_at
-- ) on table public.athletes from authenticated;
-- grant update on table public.athletes to authenticated;
--
-- drop policy if exists "athletes_select_own" on public.athletes;
-- drop policy if exists "athletes_select_admin" on public.athletes;
-- create policy "athletes_select_public"
--   on public.athletes for select using (true);
