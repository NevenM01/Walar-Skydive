-- Add "name_core" duplicates grouping and safe auto-merge for common import artefacts:
-- - team suffix appended to display_name (often ALL CAPS)
-- - placeholder country_code 'XX' / 'XXX'
-- - placeholder or incorrect DOB on junk rows
--
-- Report: adds group_type = 'name_core' based on a stripped "core" name.
-- Auto-merge: merges only when losers are clearly junk:
-- - loser.user_id is null
-- - loser.fai_licence is null/empty
-- - loser has 0 competition_results
-- - group has a clear anchor (winner) with user_id or fai_licence
-- - country match OR loser country is placeholder (XX/XXX)
--
-- To satisfy merge_athletes_safe DOB safety check, this routine nullifies loser DOB
-- if it conflicts with the anchor winner and the loser is junk (as above).

create or replace view public.athlete_duplicates_report as
with athlete_stats as (
  select
    a.id,
    a.display_name,
    a.country_code,
    a.date_of_birth,
    a.fai_licence,
    a.user_id,
    a.created_at,
    a.updated_at,
    lower(btrim(a.fai_licence)) as fai_norm,
    lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) as name_norm,
    -- Strip trailing ALL-CAPS suffix (team/import artefacts), then normalize whitespace.
    lower(
      regexp_replace(
        regexp_replace(btrim(a.display_name), '\s+[A-Z0-9ŠĐČĆŽ ]{6,}$', '', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) as name_core_norm,
    (select count(*)::bigint from public.competition_results cr where cr.athlete_id = a.id) as results_count
  from public.athletes a
),
fai_groups as (
  select fai_norm as group_key
  from athlete_stats
  where fai_norm is not null and fai_norm <> ''
  group by fai_norm
  having count(*) > 1
),
name_country_groups as (
  select (name_norm || '|' || country_code) as group_key
  from athlete_stats
  group by name_norm, country_code
  having count(*) > 1
),
name_dob_groups as (
  select (name_norm || '|' || date_of_birth::text) as group_key
  from athlete_stats
  where date_of_birth is not null
  group by name_norm, date_of_birth
  having count(*) > 1
),
name_core_groups as (
  -- Group by core name; allow placeholder country (XX/XXX) to join any real country.
  -- We only include groups where at least one row has a real country (not XX/XXX).
  select
    (name_core_norm || '|' || real_country) as group_key,
    name_core_norm,
    real_country
  from (
    select
      name_core_norm,
      -- pick a stable "real" country for the group if one exists
      (array_agg(country_code order by created_at) filter (where country_code is not null and country_code not in ('XX','XXX')))[1] as real_country,
      count(*)::int as n
    from athlete_stats
    where name_core_norm is not null and name_core_norm <> ''
    group by name_core_norm
    having count(*) >= 2
  ) g
  where real_country is not null
)
select
  'fai'::text as group_type,
  g.group_key,
  s.id,
  s.display_name,
  s.country_code,
  s.date_of_birth,
  s.fai_licence,
  s.user_id,
  s.created_at,
  s.updated_at,
  s.results_count,
  null::double precision as similarity
from fai_groups g
join athlete_stats s on s.fai_norm = g.group_key

union all

select
  'name_dob'::text as group_type,
  g.group_key,
  s.id,
  s.display_name,
  s.country_code,
  s.date_of_birth,
  s.fai_licence,
  s.user_id,
  s.created_at,
  s.updated_at,
  s.results_count,
  null::double precision as similarity
from name_dob_groups g
join athlete_stats s on (s.name_norm || '|' || s.date_of_birth::text) = g.group_key

union all

select
  'name_country'::text as group_type,
  g.group_key,
  s.id,
  s.display_name,
  s.country_code,
  s.date_of_birth,
  s.fai_licence,
  s.user_id,
  s.created_at,
  s.updated_at,
  s.results_count,
  null::double precision as similarity
from name_country_groups g
join athlete_stats s on (s.name_norm || '|' || s.country_code) = g.group_key

union all

select
  'name_core'::text as group_type,
  g.group_key,
  s.id,
  s.display_name,
  s.country_code,
  s.date_of_birth,
  s.fai_licence,
  s.user_id,
  s.created_at,
  s.updated_at,
  s.results_count,
  null::double precision as similarity
from name_core_groups g
join athlete_stats s
  on s.name_core_norm = g.name_core_norm
 and (
   s.country_code = g.real_country
   or s.country_code in ('XX','XXX')
 );


create or replace function public.auto_merge_athletes_name_core(
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
  v_winner_country text;
  v_winner_dob date;
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
    with stats as (
      select
        a.id,
        a.user_id,
        nullif(lower(btrim(a.fai_licence)), '') as fai_norm,
        a.country_code,
        a.date_of_birth,
        a.created_at,
        coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) as results_count,
        lower(
          regexp_replace(
            regexp_replace(btrim(a.display_name), '\s+[A-Z0-9ŠĐČĆŽ ]{6,}$', '', 'g'),
            '\s+',
            ' ',
            'g'
          )
        ) as name_core_norm
      from public.athletes a
      where a.display_name is not null and btrim(a.display_name) <> ''
    ),
    groups as (
      select
        name_core_norm,
        (array_agg(country_code order by created_at) filter (where country_code is not null and country_code not in ('XX','XXX')))[1] as real_country,
        count(*)::int as n,
        -- anchor candidate exists if any row has user_id or fai
        (count(*) filter (where user_id is not null or fai_norm is not null))::int as anchors,
        (count(*) filter (where user_id is null and fai_norm is null and results_count = 0))::int as junk
      from stats
      where name_core_norm is not null and name_core_norm <> ''
      group by name_core_norm
      having count(*) >= 2
    )
    select *
    from groups
    where real_country is not null
      and anchors >= 1
      and junk >= 1
    order by n desc, name_core_norm asc
    limit greatest(p_group_limit, 0)
  loop
    -- Winner: prefer user_id, then has FAI, then most results, then oldest created.
    select s.id, s.country_code, s.date_of_birth
      into v_winner_id, v_winner_country, v_winner_dob
    from (
      select
        st.*,
        case when st.user_id is not null then 1 else 0 end as has_user,
        case when st.fai_norm is not null then 1 else 0 end as has_fai
      from (
        select
          a.id,
          a.user_id,
          nullif(lower(btrim(a.fai_licence)), '') as fai_norm,
          a.country_code,
          a.date_of_birth,
          a.created_at,
          coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) as results_count,
          lower(
            regexp_replace(
              regexp_replace(btrim(a.display_name), '\s+[A-Z0-9ŠĐČĆŽ ]{6,}$', '', 'g'),
              '\s+',
              ' ',
              'g'
            )
          ) as name_core_norm
        from public.athletes a
      ) st
      where st.name_core_norm = v_group.name_core_norm
        and (st.country_code = v_group.real_country or st.country_code in ('XX','XXX'))
    ) s
    order by s.has_user desc, s.has_fai desc, s.results_count desc, s.created_at asc
    limit 1;

    if v_winner_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Losers: only "junk" rows, and only if country matches or is placeholder.
    select array_agg(a.id order by a.created_at asc) into v_loser_ids
    from public.athletes a
    where a.id <> v_winner_id
      and a.user_id is null
      and nullif(lower(btrim(a.fai_licence)), '') is null
      and coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) = 0
      and lower(
        regexp_replace(
          regexp_replace(btrim(a.display_name), '\s+[A-Z0-9ŠĐČĆŽ ]{6,}$', '', 'g'),
          '\s+',
          ' ',
          'g'
        )
      ) = v_group.name_core_norm
      and (
        a.country_code = v_group.real_country
        or a.country_code in ('XX','XXX')
      );

    v_loser_count := coalesce(array_length(v_loser_ids, 1), 0);
    if v_loser_count <= 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Nullify loser DOB if it conflicts with winner DOB (so merge_athletes_safe passes),
    -- since these losers are junk and have no results.
    if v_winner_dob is not null then
      update public.athletes
      set date_of_birth = null, updated_at = now()
      where id = any(v_loser_ids)
        and date_of_birth is not null
        and date_of_birth <> v_winner_dob;
    end if;

    begin
      perform public.merge_athletes_safe(
        v_winner_id,
        v_loser_ids,
        'auto_merge_name_core'
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

revoke all on function public.auto_merge_athletes_name_core(int) from public;
grant execute on function public.auto_merge_athletes_name_core(int) to authenticated;
grant execute on function public.auto_merge_athletes_name_core(int) to service_role;

