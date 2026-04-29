-- Key/value app settings for admins. First key: rank athletes on public leaderboard when fai_licence is empty.

create table if not exists public.walar_app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.walar_app_settings is 'Admin-editable flags; read in DB via walar_app_setting_boolean (security definer).';

insert into public.walar_app_settings (key, value)
values ('rank_athletes_without_fai_licence', 'true')
on conflict (key) do nothing;

alter table public.walar_app_settings enable row level security;

create policy "walar_app_settings_select_admin"
  on public.walar_app_settings for select
  using (public.jwt_is_app_admin());

create policy "walar_app_settings_insert_admin"
  on public.walar_app_settings for insert
  with check (public.jwt_is_app_admin());

create policy "walar_app_settings_update_admin"
  on public.walar_app_settings for update
  using (public.jwt_is_app_admin());

create policy "walar_app_settings_delete_admin"
  on public.walar_app_settings for delete
  using (public.jwt_is_app_admin());

grant select, insert, update, delete on public.walar_app_settings to authenticated;

create or replace function public.walar_app_setting_boolean(p_key text, p_default boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  select s.value into v
  from public.walar_app_settings s
  where s.key = p_key;

  if v is null then
    return p_default;
  end if;

  v := lower(trim(v));
  if v in ('true', '1', 'yes', 'on') then
    return true;
  end if;
  if v in ('false', '0', 'no', 'off') then
    return false;
  end if;
  return p_default;
end;
$$;

comment on function public.walar_app_setting_boolean(text, boolean) is
  'Reads boolean from walar_app_settings; bypasses RLS for use inside walar_recalculate_competition_result.';

revoke all on function public.walar_app_setting_boolean(text, boolean) from public;
grant execute on function public.walar_app_setting_boolean(text, boolean) to authenticated, service_role;

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
  'Recomputes WALAR points. If rank_athletes_without_fai_licence is false and fai_licence is empty, clears wal_ar_score (strict FAI).';
