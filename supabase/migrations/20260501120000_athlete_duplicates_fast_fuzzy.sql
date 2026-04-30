-- Speed up public.athlete_duplicates_report:
-- 1) Replace per-row correlated competition_results counts with a single grouped join.
-- 2) Replace O(n^2) fuzzy self-join with blocking on the first name token (same guardrails as before).
-- 3) Use stable pair keys (pair|uuid|uuid) for name_fuzzy groups.

create extension if not exists pg_trgm;

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
    a.name_norm,
    (
      array_length(regexp_split_to_array(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g'), ' '), 1) >= 3
      and regexp_replace(btrim(a.display_name), '\s+', ' ', 'g') ~ '\s+[A-Z0-9ŠĐČĆŽ ]*(TEAM|INTERNATIONAL|CLUB)\s*$'
    ) as has_team_suffix,
    (a.country_code in ('XX','XXX')) as is_placeholder_country,
    lower(
      regexp_replace(
        btrim(
          case
            when
              array_length(regexp_split_to_array(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g'), ' '), 1) >= 3
              and regexp_replace(btrim(a.display_name), '\s+', ' ', 'g') ~ '\s+[A-Z0-9ŠĐČĆŽ ]*(TEAM|INTERNATIONAL|CLUB)\s*$'
            then regexp_replace(
              btrim(a.display_name),
              '\s+(?:[A-Z0-9ŠĐČĆŽ]{2,}\s+){0,4}(?:TEAM|INTERNATIONAL|CLUB)\s*$',
              '',
              'g'
            )
            else a.display_name
          end
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as name_core_norm,
    coalesce(cr.cnt, 0)::bigint as results_count
  from public.athletes a
  left join (
    select athlete_id, count(*)::bigint as cnt
    from public.competition_results
    group by athlete_id
  ) cr on cr.athlete_id = a.id
),
fai_groups as (
  select fai_norm as group_key
  from athlete_stats
  where fai_norm is not null and fai_norm <> ''
  group by fai_norm
  having count(*) > 1
),
fai_mismatch_groups as (
  select (name_norm || '|' || country_code) as group_key
  from athlete_stats
  where fai_norm is not null and fai_norm <> ''
  group by name_norm, country_code
  having count(distinct fai_norm) > 1
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
  select
    (name_core_norm || '|' || real_country) as group_key,
    name_core_norm,
    real_country
  from (
    select
      name_core_norm,
      (array_agg(country_code order by created_at) filter (where country_code is not null and country_code not in ('XX','XXX')))[1] as real_country,
      count(*)::int as n_total,
      count(*) filter (where is_placeholder_country)::int as n_placeholder,
      count(*) filter (where has_team_suffix)::int as n_team_suffix
    from athlete_stats
    where name_core_norm is not null and name_core_norm <> ''
    group by name_core_norm
    having count(*) >= 2
       and (count(*) filter (where is_placeholder_country) >= 1 or count(*) filter (where has_team_suffix) >= 1)
  ) g
  where real_country is not null
),
name_groups as (
  select name_norm as group_key
  from athlete_stats
  where name_norm is not null and name_norm <> ''
  group by name_norm
  having count(*) > 1
),
fuzzy_pairs as (
  select
    ('pair|' || least(s1.id, s2.id)::text || '|' || greatest(s1.id, s2.id)::text) as group_key,
    least(s1.id, s2.id) as id1,
    greatest(s1.id, s2.id) as id2,
    similarity(s1.name_norm, s2.name_norm) as sim
  from athlete_stats s1
  join athlete_stats s2
    on s1.id < s2.id
   and s1.name_norm is not null
   and s2.name_norm is not null
   and s1.name_norm <> ''
   and s2.name_norm <> ''
   and s1.name_norm <> s2.name_norm
   and split_part(s1.name_norm, ' ', 1) = split_part(s2.name_norm, ' ', 1)
   and length(split_part(s1.name_norm, ' ', 1)) >= 2
   and (
     similarity(s1.name_norm, s2.name_norm) >= 0.80
     or (
       (s2.name_norm like s1.name_norm || ' %' or s1.name_norm like s2.name_norm || ' %')
       and similarity(s1.name_norm, s2.name_norm) >= 0.50
     )
   )
   and (
     s1.country_code = s2.country_code
     or (
       s1.user_id is null
       and coalesce(s1.fai_norm, '') = ''
       and s1.results_count = 0
     )
     or (
       s2.user_id is null
       and coalesce(s2.fai_norm, '') = ''
       and s2.results_count = 0
     )
   )
),
fuzzy_members as (
  select group_key, id1 as id, sim as similarity from fuzzy_pairs
  union all
  select group_key, id2, sim from fuzzy_pairs
),
fuzzy_members_dedup as (
  select group_key, id, max(similarity) as similarity
  from fuzzy_members
  group by group_key, id
),
fuzzy_groups as (
  select group_key
  from fuzzy_members_dedup
  group by group_key
  having count(*) > 1
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
  'fai_mismatch'::text as group_type,
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
from fai_mismatch_groups g
join athlete_stats s on (s.name_norm || '|' || s.country_code) = g.group_key

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
 )

union all

select
  'name'::text as group_type,
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
from name_groups g
join athlete_stats s on s.name_norm = g.group_key

union all

select
  'name_fuzzy'::text as group_type,
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
  fm.similarity
from fuzzy_groups g
join fuzzy_members_dedup fm on fm.group_key = g.group_key
join athlete_stats s on s.id = fm.id;
