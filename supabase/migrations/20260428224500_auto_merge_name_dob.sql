-- Auto-merge "safe" duplicates for groups that match by name + date_of_birth.
-- Safety constraints:
-- - group size >= 2
-- - at most 1 distinct non-null user_id in the group
-- - at most 1 distinct non-empty normalized FAI licence in the group
-- Winner selection:
-- - prefer linked user_id
-- - then higher results_count
-- - then oldest created_at

create or replace function public.auto_merge_athletes_name_dob(
  p_group_limit int default 200
)
returns table (
  merged_groups int,
  merged_athletes int,
  skipped_groups int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
  v_winner_id uuid;
  v_loser_ids uuid[];
  v_loser_count int;
  v_skipped int := 0;
  v_merged_groups int := 0;
  v_merged_athletes int := 0;
begin
  if not public.jwt_is_app_admin() then
    raise exception 'Forbidden';
  end if;

  for v_group in
    with base as (
      select
        a.id,
        a.display_name,
        a.date_of_birth,
        a.user_id,
        a.fai_licence,
        a.created_at,
        coalesce((
          select count(*)::int
          from public.competition_results cr
          where cr.athlete_id = a.id
        ), 0) as results_count,
        lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) as name_norm,
        nullif(lower(btrim(a.fai_licence)), '') as fai_norm
      from public.athletes a
      where a.date_of_birth is not null
        and a.display_name is not null
        and btrim(a.display_name) <> ''
    ),
    groups as (
      select
        (name_norm || '|' || to_char(date_of_birth, 'YYYY-MM-DD')) as group_key,
        name_norm,
        date_of_birth,
        count(*)::int as n,
        count(distinct user_id) filter (where user_id is not null)::int as distinct_users,
        count(distinct fai_norm) filter (where fai_norm is not null)::int as distinct_fai
      from base
      group by name_norm, date_of_birth
      having count(*) >= 2
    )
    select *
    from groups
    where distinct_users <= 1
      and distinct_fai <= 1
    order by n desc, group_key asc
    limit greatest(p_group_limit, 0)
  loop
    -- Choose winner within the group.
    select b.id into v_winner_id
    from (
      select *
      from (
        select
          base.*,
          case when base.user_id is not null then 1 else 0 end as has_user
        from (
          select
            a.id,
            a.user_id,
            a.created_at,
            coalesce((
              select count(*)::int
              from public.competition_results cr
              where cr.athlete_id = a.id
            ), 0) as results_count,
            lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) as name_norm,
            a.date_of_birth
          from public.athletes a
          where a.id in (
            select a2.id
            from public.athletes a2
            where a2.date_of_birth = v_group.date_of_birth
              and lower(regexp_replace(btrim(a2.display_name), '\s+', ' ', 'g')) = v_group.name_norm
          )
        ) base
      ) ranked0
      order by ranked0.has_user desc, ranked0.results_count desc, ranked0.created_at asc
      limit 1
    ) b;

    if v_winner_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select array_agg(a.id order by a.created_at asc) into v_loser_ids
    from public.athletes a
    where a.date_of_birth = v_group.date_of_birth
      and lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) = v_group.name_norm
      and a.id <> v_winner_id;

    v_loser_count := coalesce(array_length(v_loser_ids, 1), 0);
    if v_loser_count <= 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Merge. Any failure should not abort the whole batch; skip the group.
    begin
      perform public.merge_athletes_safe(
        v_winner_id,
        v_loser_ids,
        'auto_merge_name_dob'
      );
      v_merged_groups := v_merged_groups + 1;
      v_merged_athletes := v_merged_athletes + v_loser_count;
    exception
      when others then
        v_skipped := v_skipped + 1;
    end;
  end loop;

  merged_groups := v_merged_groups;
  merged_athletes := v_merged_athletes;
  skipped_groups := v_skipped;
  return next;
end;
$$;

revoke all on function public.auto_merge_athletes_name_dob(int) from public;
grant execute on function public.auto_merge_athletes_name_dob(int) to authenticated;
grant execute on function public.auto_merge_athletes_name_dob(int) to service_role;

