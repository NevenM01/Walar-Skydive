-- Remove competitions that have no athlete results (empty shells, e.g. failed or abandoned imports).
-- competition_results already uses ON DELETE CASCADE from competitions; nothing to detach first.

delete from public.competitions c
where not exists (
  select 1 from public.competition_results cr where cr.competition_id = c.id
);
