-- Age category from athlete date_of_birth + competition end_date (Excel-style rules).
-- Junior: under 18 full years at end_date. Master: YEAR(end) - YEAR(dob) > 50. Else senior.

create or replace function public.walar_age_category_from_dates(dob date, comp_end date)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when dob is null or comp_end is null then null::text
    when dob > comp_end then null::text
    when (extract(year from age(comp_end, dob))::int < 18) then 'junior'
    when (extract(year from comp_end)::int - extract(year from dob)::int > 50) then 'master'
    else 'senior'
  end;
$$;

comment on function public.walar_age_category_from_dates(date, date) is
  'WALAR age band: junior if <18 full years at comp end; master if YEAR(end)-YEAR(dob)>50 (Excel-style); else senior.';

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
begin
  select * into r from public.competition_results where id = p_id;
  if not found then
    return;
  end if;

  select c.end_date, ath.date_of_birth, ath.gender, coalesce(ath.fai_licence, '')
  into c_end, a_dob, ath_gender, ath_lic
  from public.competitions c
  join public.athletes ath on ath.id = r.athlete_id
  where c.id = r.competition_id;

  if trim(ath_lic) = '' then
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

grant execute on function public.walar_age_category_from_dates(date, date) to anon, authenticated, service_role;
