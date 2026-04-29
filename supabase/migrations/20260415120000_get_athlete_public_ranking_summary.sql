-- Public athlete profile: WALAR totals in the same rolling window as get_leaderboard (default 5y).

create or replace function public.get_athlete_public_ranking_summary(
  p_athlete_id uuid,
  p_window_years int default 5
)
returns table(
  total_points numeric,
  events_count bigint,
  best_round_cm int
)
language sql
stable
security invoker
set search_path = public
as $$
  with consent as (
    select 1 as ok
    from public.athletes a
    where a.id = p_athlete_id
      and a.gdpr_consent_given = true
  ),
  base as (
    select
      cr.wal_ar_score,
      cr.competition_id,
      cr.jump1_cm,
      cr.jump2_cm,
      cr.jump3_cm,
      cr.jump4_cm,
      cr.jump5_cm,
      cr.jump6_cm,
      cr.jump7_cm,
      cr.jump8_cm,
      cr.sf_cm,
      cr.f_cm
    from public.competition_results cr
    inner join public.competitions c on c.id = cr.competition_id
    where exists (select 1 from consent)
      and cr.athlete_id = p_athlete_id
      and cr.wal_ar_score is not null
      and c.end_date >= (current_date - (greatest(p_window_years, 1) * interval '1 year'))
  )
  select
    coalesce((select sum(b.wal_ar_score) from base b), 0)::numeric as total_points,
    coalesce((select count(distinct b.competition_id) from base b), 0)::bigint as events_count,
    (
      select min(v)::int
      from base b2
      cross join lateral (
        values
          (b2.jump1_cm),
          (b2.jump2_cm),
          (b2.jump3_cm),
          (b2.jump4_cm),
          (b2.jump5_cm),
          (b2.jump6_cm),
          (b2.jump7_cm),
          (b2.jump8_cm),
          (b2.sf_cm),
          (b2.f_cm)
      ) as vals(v)
      where vals.v is not null
    ) as best_round_cm;
$$;

comment on function public.get_athlete_public_ranking_summary(uuid, int) is
  'Rolling-window sum of wal_ar_score, distinct competition count, and best single-round cm for public athlete profile. '
  'Single result row; totals are zero when there is no GDPR consent or no scored results in the window (same window rule as get_leaderboard).';

grant execute on function public.get_athlete_public_ranking_summary(uuid, int) to anon, authenticated;
