-- Allow continued merges even when an athlete row that was previously a merge "winner"
-- later becomes a "loser" in a subsequent merge (row gets deleted).
--
-- Without this, Postgres blocks deleting athletes referenced by athlete_merge_log.winner_id
-- due to ON DELETE RESTRICT (default for FK references).

alter table public.athlete_merge_log
  alter column winner_id drop not null;

alter table public.athlete_merge_log
  drop constraint if exists athlete_merge_log_winner_id_fkey;

alter table public.athlete_merge_log
  add constraint athlete_merge_log_winner_id_fkey
    foreign key (winner_id)
    references public.athletes(id)
    on delete set null;
