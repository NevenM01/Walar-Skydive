-- Idempotent: fixes "column competitions.unique_label does not exist" when only
-- 20260324120000_initial_schema ran and 20260326110000 was skipped or failed partway.

alter table public.competitions
  add column if not exists unique_label text;

create unique index if not exists competitions_unique_label_idx
  on public.competitions (unique_label)
  where unique_label is not null;

comment on column public.competitions.unique_label is 'Stable key e.g. "2025 EEAC Hungary" for imports / SUMIF.';
