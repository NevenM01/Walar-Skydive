-- Fix walar_rank_points and walar_effective_place_for_points based on Excel parity check.
--
-- walar_rank_points: clamp result to 0..5 (Excel allows 0 for non-NT + avg>10).
-- walar_effective_place_for_points: use Place M for males, Place F for females only.
--   Subcategory columns (Place J, MJ, FJ, Master) are informational and do NOT
--   feed into the PointsPlace lookup (verified against WALARIN sheet 1146 rows,
--   98.3% exact match; remaining 1.7% are "Competitor not in Database" #N/A defaults).

-- ---------------------------------------------------------------------------
-- 1. walar_rank_points: clamp 0..5
-- ---------------------------------------------------------------------------
create or replace function public.walar_rank_points(
  member_national_team boolean,
  age_category text,
  avg_cm numeric,
  wpc_medalist boolean
)
returns numeric
language sql
immutable
parallel safe
as $$
  select greatest(0, least(5,
    (case when coalesce(member_national_team, false) then 3 else 1 end)::numeric
    + (case when lower(trim(coalesce(age_category, ''))) = 'junior' then 1 else 0 end)::numeric
    + (case when coalesce(avg_cm, 0) > 10 then -1 else 0 end)::numeric
    + (case when coalesce(wpc_medalist, false) then 2 else 0 end)::numeric
  ));
$$;

-- ---------------------------------------------------------------------------
-- 2. walar_effective_place_for_points: gender-only (Excel AC/AD)
-- ---------------------------------------------------------------------------
-- Drop old 9-arg version signature first, then create new 3-arg version.
-- Keep backward compat: the old 9-arg version is replaced inline so callers
-- using the old signature still work (CREATE OR REPLACE preserves overloads).
create or replace function public.walar_effective_place_for_points(
  p_gender text,
  p_age_category text,
  p_place_overall int,
  p_place_m int,
  p_place_f int,
  p_place_j int,
  p_place_mj int,
  p_place_fj int,
  p_place_master int
)
returns int
language sql
immutable
parallel safe
as $$
  select case
    when upper(trim(coalesce(p_gender, ''))) = 'F'
         and p_place_f is not null then p_place_f
    when p_place_m is not null then p_place_m
    when p_place_overall is not null then p_place_overall
    else null::int
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Refresh walar_recalculate_competition_result to match (no signature change)
-- ---------------------------------------------------------------------------
create or replace function public.walar_recalculate_competition_result(p_id uuid)
returns void
language plpgsql
as $$
declare
  r public.competition_results%rowtype;
  c_end date;
  a_dob date;
  eff_cat text;
  ath_gender text;
  ath_lic text;
  t numeric;
  jr int;
  a numeric;
  av numeric;
  ax numeric;
  aw numeric;
  ep int;
  wi int;
  rank_without_fai boolean;
begin
  select * into r from public.competition_results where id = p_id;
  if not found then
    return;
  end if;

  rank_without_fai := public.walar_app_setting_boolean('rank_athletes_without_fai_licence', true);

  select c.end_date, ath.date_of_birth, ath.gender, coalesce(ath.fai_licence, '')
  into c_end, a_dob, ath_gender, ath_lic
  from public.competitions c
  join public.athletes ath on ath.id = r.athlete_id
  where c.id = r.competition_id;

  if trim(ath_lic) = '' and not rank_without_fai then
    update public.competition_results
    set
      age_category = coalesce(
        case
          when a_dob is not null and c_end is not null then public.walar_age_category_from_dates(a_dob, c_end)
          else null
        end,
        r.age_category
      ),
      walar_rating = null,
      rank_points = null,
      results_points = null,
      wal_ar_score = null,
      updated_at = now()
    where id = p_id;
    return;
  end if;

  eff_cat := null;
  if a_dob is not null and c_end is not null then
    eff_cat := public.walar_age_category_from_dates(a_dob, c_end);
  end if;

  if eff_cat is null then
    eff_cat := r.age_category;
  end if;

  select jt.total_cm, jt.jump_rounds, jt.avg_cm
  into t, jr, a
  from public.walar_jump_totals(
    r.jump1_cm, r.jump2_cm, r.jump3_cm, r.jump4_cm, r.jump5_cm, r.jump6_cm, r.jump7_cm, r.jump8_cm,
    r.sf_cm, r.f_cm
  ) as jt;

  av := public.walar_rank_points(r.member_national_team, eff_cat, a, r.wpc_medalist);
  ax := public.walar_results_points_lookup(t, jr);

  ep := public.walar_effective_place_for_points(
    ath_gender,
    eff_cat,
    r.place_overall,
    r.place_m,
    r.place_f,
    r.place_j,
    r.place_mj,
    r.place_fj,
    r.place_master
  );

  select wr.sort_order into wi
  from public.competitions c
  left join public.walar_competition_rang wr on wr.code = c.competition_rang_code
  where c.id = r.competition_id;

  aw := public.walar_placement_points_lookup(ep, wi);

  update public.competition_results
  set
    age_category = eff_cat,
    walar_rating = av,
    rank_points = aw,
    results_points = ax,
    wal_ar_score = aw + ax,
    updated_at = now()
  where id = p_id;
end;
$$;

comment on function public.walar_recalculate_competition_result(uuid) is
  'Recomputes WALAR points (Excel parity v2). Rating clamped 0..5; placement uses Place M / Place F only.';
