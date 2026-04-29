-- Extend public.get_leaderboard() with licence filtering and default policy.
-- - p_licence = 'fai_only' => require non-empty athletes.fai_licence
-- - p_licence = 'all'      => allow all (override)
-- - p_licence = null       => default based on walar_app_settings.rank_athletes_without_fai_licence

-- Public endpoint needs to read the setting (security definer already protects table access).
grant execute on function public.walar_app_setting_boolean(text, boolean) to anon;

create or replace function public.get_leaderboard(
  p_gender text default 'all',
  p_competition_id uuid default null,
  p_window_years int default 5,
  p_licence text default null
)
returns table(
  athlete_id uuid,
  total_points numeric,
  events_count bigint,
  display_name text,
  country_code text,
  gender text,
  avatar_url text
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      case
        when lower(trim(coalesce(p_licence, ''))) = 'fai_only' then true
        when lower(trim(coalesce(p_licence, ''))) = 'all' then false
        else not public.walar_app_setting_boolean('rank_athletes_without_fai_licence', true)
      end as require_fai
  ),
  base as (
    select cr.athlete_id, cr.competition_id, cr.wal_ar_score, c.end_date
    from public.competition_results cr
    inner join public.competitions c on c.id = cr.competition_id
    where cr.wal_ar_score is not null
      and (p_competition_id is null or cr.competition_id = p_competition_id)
      and c.end_date >= (current_date - (greatest(p_window_years, 1) * interval '1 year'))
  ),
  agg as (
    select
      b.athlete_id,
      sum(b.wal_ar_score)::numeric as total_points,
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

comment on function public.get_leaderboard(text, uuid, int, text) is
  'Public leaderboard: sum wal_ar_score in rolling window; optional single-competition filter. '
  'Supports licence filtering (p_licence = fai_only/all/null). '
  'Default licence policy uses walar_app_settings.rank_athletes_without_fai_licence. '
  'Includes athlete avatar_url for UI. '
  'Ties on points within one competition are broken by effective placement (PointsPlace row), then name.';

grant execute on function public.get_leaderboard(text, uuid, int, text) to anon, authenticated;

