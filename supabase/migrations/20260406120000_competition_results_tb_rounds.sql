-- Optional tie-break rounds (cm). Record-only for import / display.
-- Does NOT enter walar_jump_totals; WALAR score (AX) uses jumps 1–8 + SF + F only.
-- Final ranks after TB should be stored in place_* columns (from Excel / bulletin).

alter table public.competition_results
  add column if not exists tb1_cm numeric,
  add column if not exists tb2_cm numeric,
  add column if not exists tb3_cm numeric,
  add column if not exists tb4_cm numeric,
  add column if not exists tb5_cm numeric,
  add column if not exists tb6_cm numeric;

comment on column public.competition_results.tb1_cm is 'Tie-break round 1 (cm). Optional; not summed into PointsCM total.';
comment on column public.competition_results.tb2_cm is 'Tie-break round 2 (cm). Optional.';
comment on column public.competition_results.tb3_cm is 'Tie-break round 3 (cm). Optional.';
comment on column public.competition_results.tb4_cm is 'Tie-break round 4 (cm). Optional.';
comment on column public.competition_results.tb5_cm is 'Tie-break round 5 (cm). Optional.';
comment on column public.competition_results.tb6_cm is 'Tie-break round 6 (cm). Optional.';
