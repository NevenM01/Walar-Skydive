-- Duplicate athletes report.
-- Groups by:
-- 1) normalized FAI licence (when present)
-- 2) normalized name + country_code (fallback)
--
-- Includes results_count to help pick a winner for merges.

with athlete_stats as (
  select
    a.id,
    a.display_name,
    a.country_code,
    a.date_of_birth,
    a.fai_licence,
    a.user_id,
    a.created_at,
    lower(btrim(a.fai_licence)) as fai_norm,
    lower(trim(a.display_name)) as name_norm,
    (select count(*)::bigint from public.competition_results cr where cr.athlete_id = a.id) as results_count
  from public.athletes a
),
fai_dupes as (
  select fai_norm as group_key
  from athlete_stats
  where fai_norm is not null and fai_norm <> ''
  group by fai_norm
  having count(*) > 1
),
name_country_dupes as (
  select (name_norm || '|' || country_code) as group_key
  from athlete_stats
  group by name_norm, country_code
  having count(*) > 1
)
select
  'fai'::text as group_type,
  d.group_key,
  s.*
from fai_dupes d
join athlete_stats s on s.fai_norm = d.group_key

union all

select
  'name_country'::text as group_type,
  d.group_key,
  s.*
from name_country_dupes d
join athlete_stats s on (s.name_norm || '|' || s.country_code) = d.group_key

order by group_type, group_key, results_count desc, created_at asc, id asc;

