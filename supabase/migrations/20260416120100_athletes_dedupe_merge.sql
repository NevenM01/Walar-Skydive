-- One-time: normalize athletes.country_code to ISO2, merge duplicate athletes (same normalized name + country),
-- retarget competition_results, dedupe results by wal_ar_score, delete merged athlete rows.
-- Requires 20260416120000_country_aliases.sql applied first.

-- 1) Canonical country on every athlete row
update public.athletes
set country_code = public.normalize_country_to_iso2(country_code)::text;

do $$
begin
  if exists (select 1 from public.athletes where country_code is null limit 1) then
    raise exception 'athletes_dedupe_merge: country_code NULL after normalize — extend public.country_aliases';
  end if;
end $$;

-- 2) Map loser athlete -> winner (most competition_results wins; tie-break oldest created_at, then smallest id)
create temporary table _athlete_merge (
  loser_id uuid primary key,
  winner_id uuid not null
) on commit drop;

insert into _athlete_merge (loser_id, winner_id)
with athlete_stats as (
  select
    a.id,
    lower(trim(a.display_name)) as nname,
    a.country_code as cc,
    (select count(*)::bigint from public.competition_results cr where cr.athlete_id = a.id) as rcnt,
    a.created_at
  from public.athletes a
),
winners as (
  select distinct on (nname, cc)
    id as winner_id,
    nname,
    cc
  from athlete_stats
  order by nname, cc, rcnt desc, created_at asc, id asc
)
select s.id as loser_id, w.winner_id
from athlete_stats s
inner join winners w
  on w.nname = s.nname
 and w.cc = s.cc
 and w.winner_id <> s.id;

-- 3) Fill missing profile fields on winner from any loser (first non-null by loser created_at)
update public.athletes wn
set
  user_id = coalesce(wn.user_id, agg.pick_uid),
  fai_licence = coalesce(wn.fai_licence, agg.pick_fai),
  date_of_birth = coalesce(wn.date_of_birth, agg.pick_dob),
  bio = coalesce(wn.bio, agg.pick_bio),
  club = coalesce(wn.club, agg.pick_club),
  website_url = coalesce(wn.website_url, agg.pick_web),
  instagram_url = coalesce(wn.instagram_url, agg.pick_ig),
  facebook_url = coalesce(wn.facebook_url, agg.pick_fb),
  updated_at = now()
from (
  select
    m.winner_id,
    (array_agg(l.user_id order by l.created_at) filter (where l.user_id is not null))[1] as pick_uid,
    (array_agg(l.fai_licence order by l.created_at) filter (where l.fai_licence is not null))[1] as pick_fai,
    (array_agg(l.date_of_birth order by l.created_at) filter (where l.date_of_birth is not null))[1] as pick_dob,
    (array_agg(l.bio order by l.created_at) filter (where l.bio is not null))[1] as pick_bio,
    (array_agg(l.club order by l.created_at) filter (where l.club is not null))[1] as pick_club,
    (array_agg(l.website_url order by l.created_at) filter (where l.website_url is not null))[1] as pick_web,
    (array_agg(l.instagram_url order by l.created_at) filter (where l.instagram_url is not null))[1] as pick_ig,
    (array_agg(l.facebook_url order by l.created_at) filter (where l.facebook_url is not null))[1] as pick_fb
  from _athlete_merge m
  inner join public.athletes l on l.id = m.loser_id
  group by m.winner_id
) agg
where wn.id = agg.winner_id;

-- 4) Point all results at winners
update public.competition_results cr
set athlete_id = m.winner_id,
    updated_at = now()
from _athlete_merge m
where cr.athlete_id = m.loser_id;

-- 5) Same competition + same athlete twice: keep best wal_ar_score (NULL loses); tie-break smaller id
delete from public.competition_results cr
using (
  select id
  from (
    select id,
           row_number() over (
             partition by competition_id, athlete_id
             order by wal_ar_score desc nulls last, id asc
           ) as rn
    from public.competition_results
  ) ranked
  where ranked.rn > 1
) d
where cr.id = d.id;

-- 6) Remove merged athlete rows (no FK left pointing at losers)
delete from public.athletes a
using _athlete_merge m
where a.id = m.loser_id;
