-- Close public PostgREST access to athlete_duplicates_report for anon/authenticated.
-- Admins load the report via admin_athlete_duplicates_report() (SECURITY DEFINER reads the view).
-- Note: PostgreSQL does not support ENABLE ROW LEVEL SECURITY on this view (relation type).

create or replace function public.admin_athlete_duplicates_report()
returns table (
  group_type text,
  group_key text,
  id uuid,
  display_name text,
  country_code text,
  date_of_birth date,
  fai_licence text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  results_count bigint,
  similarity double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.jwt_is_app_admin() then
    raise exception 'Forbidden';
  end if;

  return query
  select
    v.group_type,
    v.group_key,
    v.id,
    v.display_name,
    v.country_code,
    v.date_of_birth,
    v.fai_licence,
    v.user_id,
    v.created_at,
    v.updated_at,
    v.results_count,
    v.similarity
  from public.athlete_duplicates_report v
  order by
    v.group_type asc,
    v.group_key asc,
    v.results_count desc,
    v.created_at asc;
end;
$$;

revoke all on function public.admin_athlete_duplicates_report() from public;
revoke all on function public.admin_athlete_duplicates_report() from anon;
grant execute on function public.admin_athlete_duplicates_report() to authenticated;
grant execute on function public.admin_athlete_duplicates_report() to service_role;

revoke all on public.athlete_duplicates_report from public;
revoke all on public.athlete_duplicates_report from anon;
revoke all on public.athlete_duplicates_report from authenticated;
