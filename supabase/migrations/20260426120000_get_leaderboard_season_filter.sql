-- Extend public.get_leaderboard() with explicit season date-range filtering.
-- - p_season_start / p_season_end (YYYY-MM-DD): when both set, restrict to
--   competitions whose end_date falls within [start, end] instead of the
--   rolling p_window_years window.
-- - Fixes "Season 2025" filter which previously fell back to 5-year window.

create or replace function public.get_leaderboard(
  p_gender        text    default 'all',
  p_competition_id uuid   default null,
  p_window_years  int     default 5,
  p_licence       text    default null,
  p_season_start  date    default null,
  p_season_end    date    default null
)
returns table(
  athlete_id   uuid,
  total_points numeric,
  events_count bigint,
  display_name text,
  country_code text,
  gender       text,
  avatar_url   text
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      -- FAI licence filter
      case
        when lower(trim(coalesce(p_licence, ''))) = 'fai_only' then true
        when lower(trim(coalesce(p_licence, ''))) = 'all'      then false
        else not public.walar_app_setting_boolean('rank_athletes_without_fai_licence', true)
      end as require_fai,
      -- Date window: explicit season range takes priority over rolling window
      case
        when p_season_start is not null and p_season_end is not null then p_season_start
        else (current_date - (greatest(p_window_years, 1) * interval '1 year'))::date
      end as window_start,
      case
        when p_season_start is not null and p_season_end is not null then p_season_end
        else current_date
      end as window_end
  ),
  base as (
    select cr.athlete_id, cr.competition_id, cr.wal_ar_score, c.end_date
    from public.competition_results cr
    inner join public.competitions c on c.id = cr.competition_id
    cross join params
    where cr.wal_ar_score is not null
      and (p_competition_id is null or cr.competition_id = p_competition_id)
      and c.end_date >= params.window_start
      and c.end_date <= params.window_end
  ),
  agg as (
    select
      b.athlete_id,
      sum(b.wal_ar_score)::numeric  as total_points,
      count(distinct b.competition_id)::bigint as events_count
    from base b
    group by b.athlete_id
  )
  select
    a.athlete_id,
    a.total_points,
    a.events_count,
    ath.display_name,
    ath.country_code,
    ath.gender,
    ath.avatar_url
  from agg a
  inner join public.athletes ath on ath.id = a.athlete_id
  left join lateral (
    select
      cr.place_overall,
      cr.place_m,
      cr.place_f,
      cr.place_j,
      cr.place_mj,
      cr.place_fj,
      cr.place_master,
      cr.age_category
    from public.competition_results cr
    where cr.athlete_id = a.athlete_id
      and cr.competition_id = p_competition_id
  ) cr on true
  where ath.gdpr_consent_given = true
    and (p_gender = 'all' or ath.gender = p_gender)
    and (
      (select require_fai from params) = false
      or trim(coalesce(ath.fai_licence, '')) <> ''
    )
  order by
    a.total_points desc,
    case
      when p_competition_id is not null then
        public.walar_effective_place_for_points(
          ath.gender::text,
          cr.age_category::text,
          cr.place_overall,
          cr.place_m,
          cr.place_f,
          cr.place_j,
          cr.place_mj,
          cr.place_fj,
          cr.place_master
        )
    end asc nulls last,
    ath.display_name asc;
$$;

comment on function public.get_leaderboard(text, uuid, int, text, date, date) is
  'Public leaderboard: sum wal_ar_score in rolling window or explicit season date range. '
  'p_season_start + p_season_end override p_window_years (used for Season 20XX filter). '
  'Licence filtering: fai_only / all / null (null = admin setting). '
  'Avatar URL included. Ties in single-competition view broken by placement then name.';

grant execute on function public.get_leaderboard(text, uuid, int, text, date, date) to anon, authenticated;
