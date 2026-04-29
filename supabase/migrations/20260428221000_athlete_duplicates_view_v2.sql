-- Athlete duplicates report v2:
-- - FAI duplicates (exact, normalized)
-- - Name + DOB duplicates (exact, normalized)
-- - Name + country duplicates (exact, normalized)
-- - Fuzzy name candidates (pg_trgm similarity >= 0.70) scoped by same DOB or XX/XXX placeholder country

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
    lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) as name_norm,
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
fuzzy_pairs as (
  -- Pairwise candidates with similarity >= 0.70.
  -- Scope is limited to keep this fast for ~5k athletes:
  -- - same DOB, OR
  -- - one side has placeholder country (XX/XXX)
  select
    least(a.id, b.id) as a_id,
    greatest(a.id, b.id) as b_id,
    similarity(a.name_norm, b.name_norm) as sim
  from athlete_stats a
  join athlete_stats b
    on a.id < b.id
   and (
     (a.date_of_birth is not null and a.date_of_birth = b.date_of_birth)
     or a.country_code in ('XX','XXX')
     or b.country_code in ('XX','XXX')
   )
  where similarity(a.name_norm, b.name_norm) >= 0.70
),
fuzzy_groups as (
  select
    ('pair|' || a_id::text || '|' || b_id::text) as group_key,
    a_id as id,
    sim
  from fuzzy_pairs
  union all
  select
    ('pair|' || a_id::text || '|' || b_id::text) as group_key,
    b_id as id,
    sim
  from fuzzy_pairs
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
  'fuzzy'::text as group_type,
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
  g.sim as similarity
from fuzzy_groups g
join athlete_stats s on s.id = g.id;

