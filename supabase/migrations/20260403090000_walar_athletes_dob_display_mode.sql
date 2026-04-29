-- Choose how date_of_birth is displayed publicly: age in years ("age") or exact date ("date").
-- Admins can edit per athlete; public UIs read this column.

alter table public.athletes
  add column if not exists dob_display_mode text not null default 'age'
  check (dob_display_mode in ('age', 'date'));

-- Safety for existing nulls (in case a deployment skipped the default).
update public.athletes
set dob_display_mode = 'age'
where dob_display_mode is null;

