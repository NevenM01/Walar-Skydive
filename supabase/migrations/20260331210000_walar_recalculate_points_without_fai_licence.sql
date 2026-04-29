-- Public leaderboard uses sum(wal_ar_score); previously empty fai_licence forced wal_ar_score = null,
-- so imports without FAI numbers produced an empty ranking. WALAR formulas still apply; licence
-- can be enforced in reporting later if needed.

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
  t numeric;
  jr int;
  a numeric;
  av numeric;
  ax numeric;
  aw numeric;
  ep int;
  wi int;
begin
  select * into r from public.competition_results where id = p_id;
  if not found then
    return;
  end if;

  select c.end_date, ath.date_of_birth, ath.gender
  into c_end, a_dob, ath_gender
  from public.competitions c
  join public.athletes ath on ath.id = r.athlete_id
  where c.id = r.competition_id;

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
  'Recomputes WALAR points for one result row (age from DOB when set). Points apply even when fai_licence is empty so public leaderboard can rank imports.';
