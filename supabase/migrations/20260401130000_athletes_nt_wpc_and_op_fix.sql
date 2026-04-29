-- Athletes: add member_national_team and wpc_medalist_date (athlete-level attributes).
-- Fix organizer points: sum(walar_rating) instead of sum(rank_points).
-- Update recalculate_competition_result to read NT/WPC from athletes table.

-- ---------------------------------------------------------------------------
-- 1. New columns on athletes
-- ---------------------------------------------------------------------------
alter table public.athletes
  add column if not exists member_national_team boolean not null default false;

alter table public.athletes
  add column if not exists wpc_medalist_date date;

comment on column public.athletes.member_national_team is
  'True = competed at last WPC (Excel Athletes!L "2024 WPC"). Drives walar_rating NT bonus (+2 pts).';

comment on column public.athletes.wpc_medalist_date is
  'Date of first WPC medal (Excel Athletes!V "WPC Medalist"). NULL = never won. '
  'Per-competition wpc_medalist = competition.end_date >= wpc_medalist_date.';

-- ---------------------------------------------------------------------------
-- 2. Fix walar_recalculate_competition_organizer_points
--    Bug: was summing rank_points (AW) instead of walar_rating (AV).
--    Excel formula: (M+F+JM+JF) * finished_rounds * SUM(AV ratings)
-- ---------------------------------------------------------------------------
create or replace function public.walar_recalculate_competition_organizer_points(p_competition_id uuid)
returns void
language plpgsql
as $$
declare
  v_finished int;
  v_bulletin_sum int;
  v_sum_av numeric;
  v_op numeric;
begin
  select c.finished_jump_rounds into v_finished
  from public.competitions c
  where c.id = p_competition_id;

  select
    coalesce(c.bulletin_male, 0) + coalesce(c.bulletin_female, 0)
    + coalesce(c.bulletin_jm, 0) + coalesce(c.bulletin_jf, 0)
  into v_bulletin_sum
  from public.competitions c
  where c.id = p_competition_id;

  -- Corrected: sum walar_rating (AV column, 0..5) not rank_points (AW)
  select coalesce(sum(cr.walar_rating), 0) into v_sum_av
  from public.competition_results cr
  where cr.competition_id = p_competition_id;

  v_op := v_bulletin_sum::numeric
          * greatest(coalesce(v_finished, 0), 0)::numeric
          * v_sum_av;

  update public.competitions
  set
    wal_ar_organizer_points = v_op,
    wal_ar_tier = public.walar_tier_from_op(v_op),
    updated_at = now()
  where id = p_competition_id;
end;
$$;

comment on function public.walar_recalculate_competition_organizer_points(uuid) is
  'Recomputes competition organizer points: (M+F+JM+JF) * finished_rounds * SUM(walar_rating). '
  'Excel column AV (walar_rating 0..5), NOT AW (rank_points).';

-- ---------------------------------------------------------------------------
-- 3. Update walar_recalculate_competition_result to read NT and WPC from athletes
--    Previously: read member_national_team and wpc_medalist from competition_results row.
--    Now:        read member_national_team from athletes.member_national_team,
--                compute wpc_medalist = (competition.end_date >= athletes.wpc_medalist_date).
-- ---------------------------------------------------------------------------
create or replace function public.walar_recalculate_competition_result(p_id uuid)
returns void
language plpgsql
as $$
declare
  r public.competition_results%rowtype;
  c_end date;
  a_dob date;
  a_nt boolean;
  a_wpc_date date;
  eff_cat text;
  ath_gender text;
  ath_lic text;
  computed_wpc boolean;
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

  select
    c.end_date,
    ath.date_of_birth,
    ath.gender,
    coalesce(ath.fai_licence, ''),
    coalesce(ath.member_national_team, false),
    ath.wpc_medalist_date
  into c_end, a_dob, ath_gender, ath_lic, a_nt, a_wpc_date
  from public.competitions c
  join public.athletes ath on ath.id = r.athlete_id
  where c.id = r.competition_id;

  if trim(ath_lic) = '' and not rank_without_fai then
    update public.competition_results
    set
      age_category = coalesce(
        case
          when a_dob is not null and c_end is not null
          then public.walar_age_category_from_dates(a_dob, c_end)
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

  -- WPC medalist: date-based check, same as Excel AT formula
  -- AT = IF(competition_date > (wpc_medalist_date - 1), "YES", "NO")
  -- Equivalent: competition.end_date >= athletes.wpc_medalist_date
  computed_wpc := (c_end is not null and a_wpc_date is not null and c_end >= a_wpc_date);

  select jt.total_cm, jt.jump_rounds, jt.avg_cm
  into t, jr, a
  from public.walar_jump_totals(
    r.jump1_cm, r.jump2_cm, r.jump3_cm, r.jump4_cm, r.jump5_cm,
    r.jump6_cm, r.jump7_cm, r.jump8_cm, r.sf_cm, r.f_cm
  ) as jt;

  av := public.walar_rank_points(a_nt, eff_cat, a, computed_wpc);
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
  'Recomputes WALAR points (Excel parity v3). '
  'member_national_team read from athletes table. '
  'wpc_medalist computed as competition.end_date >= athletes.wpc_medalist_date. '
  'Rating clamped 0..5; placement uses Place M / Place F only.';
