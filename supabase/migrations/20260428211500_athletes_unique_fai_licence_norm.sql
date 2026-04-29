-- Prevent duplicate athlete rows when FAI licence is present.
-- Uses a normalized expression index to ignore case and surrounding whitespace.

create unique index if not exists athletes_fai_licence_norm_unique
  on public.athletes ((lower(btrim(fai_licence))))
  where fai_licence is not null and btrim(fai_licence) <> '';

