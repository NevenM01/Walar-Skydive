-- Remove fuzzy matching from athlete_duplicates_report (was timing out on ~5k athletes).
-- Keep `similarity` column for backward compatibility (always NULL).

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
join athlete_stats s on (s.name_norm || '|' || s.country_code) = g.group_key;

