-- Admin-only batch recalculation (uses caller JWT inside SECURITY DEFINER).

create or replace function public.walar_admin_recalculate_competition(p_competition_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r uuid;
begin
  if auth.uid() is null or not public.jwt_is_app_admin() then
    raise exception 'not allowed';
  end if;

  for r in
    select cr.id
    from public.competition_results cr
    where cr.competition_id = p_competition_id
  loop
    perform public.walar_recalculate_competition_result(r);
  end loop;

  perform public.walar_recalculate_competition_organizer_points(p_competition_id);
end;
$$;

comment on function public.walar_admin_recalculate_competition(uuid) is
  'Recalculate rank/results/WALAR score for all rows of one competition, then organizer OP/tier. Admin only.';

revoke all on function public.walar_admin_recalculate_competition(uuid) from public;
grant execute on function public.walar_admin_recalculate_competition(uuid) to authenticated;
grant execute on function public.walar_admin_recalculate_competition(uuid) to service_role;

create or replace function public.walar_admin_recalculate_all_results()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  n int := 0;
begin
  if auth.uid() is null or not public.jwt_is_app_admin() then
    raise exception 'not allowed';
  end if;

  for cid in
    select distinct cr.competition_id
    from public.competition_results cr
  loop
    perform public.walar_admin_recalculate_competition(cid);
    n := n + 1;
  end loop;

  return n;
end;
$$;

comment on function public.walar_admin_recalculate_all_results() is
  'Runs walar_admin_recalculate_competition for each competition that has results. Admin only.';

revoke all on function public.walar_admin_recalculate_all_results() from public;
grant execute on function public.walar_admin_recalculate_all_results() to authenticated;
grant execute on function public.walar_admin_recalculate_all_results() to service_role;
