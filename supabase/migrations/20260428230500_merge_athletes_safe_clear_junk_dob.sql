-- Helper wrapper: clear conflicting DOB on "junk" loser rows before calling merge_athletes_safe.
-- Junk loser definition (must all hold):
-- - no user_id
-- - no fai_licence
-- - 0 competition_results
--
-- This is used for "name_core" merges where imports produced placeholder DOBs.

create or replace function public.merge_athletes_safe_clear_junk_dob(
  p_winner_id uuid,
  p_loser_ids uuid[],
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_dob date;
begin
  if not public.jwt_is_app_admin() then
    raise exception 'Forbidden';
  end if;

  select date_of_birth into v_winner_dob
  from public.athletes
  where id = p_winner_id;

  if v_winner_dob is not null then
    update public.athletes a
    set date_of_birth = null,
        updated_at = now()
    where a.id = any(p_loser_ids)
      and a.user_id is null
      and nullif(lower(btrim(a.fai_licence)), '') is null
      and coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) = 0
      and a.date_of_birth is not null
      and a.date_of_birth <> v_winner_dob;
  end if;

  perform public.merge_athletes_safe(p_winner_id, p_loser_ids, p_reason);
end;
$$;

revoke all on function public.merge_athletes_safe_clear_junk_dob(uuid, uuid[], text) from public;
grant execute on function public.merge_athletes_safe_clear_junk_dob(uuid, uuid[], text) to authenticated;
grant execute on function public.merge_athletes_safe_clear_junk_dob(uuid, uuid[], text) to service_role;

