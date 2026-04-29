-- Organizer points (OP): mirror Excel AA = (V + W) * SUM(AV) * L
-- V = all participants; W = juniors only; juniors counted twice (V + W).
-- L = competitions.finished_jump_rounds.
-- When there are no competition_results yet, fall back to bulletin sum (M+F+JM+JF).

create or replace function public.walar_recalculate_competition_organizer_points(p_competition_id uuid)
returns void
language plpgsql
as $$
declare
  v_finished     int;
  v_total        int;
  v_juniors      int;
  v_part         int;
  v_sum_av       numeric;
  v_bulletin_sum int;
  v_op           numeric;
begin
  select c.finished_jump_rounds into v_finished
  from public.competitions c
  where c.id = p_competition_id;

  select
    count(*)::int,
    count(*) filter (where lower(trim(coalesce(cr.age_category, ''))) = 'junior')::int,
    coalesce(sum(cr.walar_rating), 0)
  into v_total, v_juniors, v_sum_av
  from public.competition_results cr
  where cr.competition_id = p_competition_id;

  v_part := coalesce(v_total, 0) + coalesce(v_juniors, 0);

  if v_part = 0 then
    select
      coalesce(c.bulletin_male, 0) + coalesce(c.bulletin_female, 0)
      + coalesce(c.bulletin_jm, 0) + coalesce(c.bulletin_jf, 0)
    into v_bulletin_sum
    from public.competitions c
    where c.id = p_competition_id;
    v_part := coalesce(v_bulletin_sum, 0);
  end if;

  v_op := v_part::numeric
          * coalesce(v_sum_av, 0)
          * greatest(coalesce(v_finished, 0), 0)::numeric;

  update public.competitions
  set
    wal_ar_organizer_points = v_op,
    wal_ar_tier = public.walar_tier_from_op(v_op),
    updated_at = now()
  where id = p_competition_id;
end;
$$;

comment on function public.walar_recalculate_competition_organizer_points(uuid) is
  'Recomputes competition organizer points: (COUNT(*) + COUNT(juniors)) * SUM(walar_rating) * finished_jump_rounds. '
  'Mirrors Excel (V+W)*SUMIF(AV)*L; juniors double-counted. Falls back to bulletin sum when no results.';
