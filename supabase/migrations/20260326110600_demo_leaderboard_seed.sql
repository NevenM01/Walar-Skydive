-- Demo athletes + results so public leaderboard is non-empty after migrate (remove in production if undesired).

insert into public.athletes (
  id, display_name, country_code, gender, gdpr_publish_full_name, gdpr_consent_given, fai_licence
) values
  (
    'a0000001-0000-4000-8000-000000000001',
    'Demo Athlete One',
    'HR',
    'M',
    true,
    true,
    'DEMO-LIC-001'
  ),
  (
    'a0000002-0000-4000-8000-000000000002',
    'Demo Athlete Two',
    'DE',
    'F',
    true,
    true,
    'DEMO-LIC-002'
  )
on conflict (id) do update set
  fai_licence = excluded.fai_licence,
  updated_at = now();

insert into public.competition_results (
  competition_id,
  athlete_id,
  jump1_cm, jump2_cm, jump3_cm, jump4_cm, jump5_cm, jump6_cm, jump7_cm, jump8_cm,
  sf_cm, f_cm,
  member_national_team,
  age_category,
  wpc_medalist,
  place_m
) values
  (
    'c0000001-0000-4000-8000-000000000001',
    'a0000001-0000-4000-8000-000000000001',
    2, 2, 3, 2, 2, 2, 2, 2,
    3, 4,
    false,
    'Senior',
    false,
    1
  ),
  (
    'c0000001-0000-4000-8000-000000000001',
    'a0000002-0000-4000-8000-000000000002',
    1, 1, 1, 1, 1, 1, 1, 1,
    2, 2,
    true,
    'junior',
    false,
    2
  )
on conflict (competition_id, athlete_id) do update set
  place_m = excluded.place_m,
  updated_at = now();

update public.competitions
set
  season = 2025,
  unique_label = '2025 WALAR Cup Grobnik',
  finished_jump_rounds = 10,
  bulletin_male = 2,
  bulletin_female = 0,
  bulletin_jm = 0,
  bulletin_jf = 0,
  competition_rang_code = 'WALAR C'
where id = 'c0000001-0000-4000-8000-000000000001';

do $$
declare
  r record;
begin
  for r in
    select id from public.competition_results
    where competition_id = 'c0000001-0000-4000-8000-000000000001'
  loop
    perform public.walar_recalculate_competition_result(r.id);
  end loop;
  perform public.walar_recalculate_competition_organizer_points('c0000001-0000-4000-8000-000000000001');
end $$;
