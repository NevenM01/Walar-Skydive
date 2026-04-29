-- Run in Supabase SQL editor (or psql) to list competitions missing competition_rang_code.
-- Rank points (AW) need a valid rang for PointsPlace column index.

select
  c.id,
  c.name,
  c.unique_label,
  c.start_date,
  c.end_date,
  c.location
from public.competitions c
where c.competition_rang_code is null
   or trim(c.competition_rang_code) = ''
order by c.end_date desc nulls last, c.name;
