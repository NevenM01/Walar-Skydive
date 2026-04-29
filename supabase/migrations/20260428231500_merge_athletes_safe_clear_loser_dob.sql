-- Wrapper: clear conflicting DOB on ALL loser rows before calling merge_athletes_safe.
-- This enables manual merges where admin-selected winner is correct, but imports created
-- wrong DOB values on duplicate rows.
--
-- Safety constraints that remain enforced by merge_athletes_safe:
-- - admin-only
-- - at most 1 distinct non-null user_id across the set
--
-- This function will set loser.date_of_birth to NULL whenever it differs from winner DOB.

create or replace function public.merge_athletes_safe_clear_loser_dob(
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
      and a.date_of_birth is not null
      and a.date_of_birth <> v_winner_dob;
  end if;

  perform public.merge_athletes_safe(p_winner_id, p_loser_ids, p_reason);
end;
$$;

revoke all on function public.merge_athletes_safe_clear_loser_dob(uuid, uuid[], text) from public;
grant execute on function public.merge_athletes_safe_clear_loser_dob(uuid, uuid[], text) to authenticated;
grant execute on function public.merge_athletes_safe_clear_loser_dob(uuid, uuid[], text) to service_role;

