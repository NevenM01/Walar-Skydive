-- Canonical ISO 3166-1 alpha-2 for athletes.country_code + alias lookup (import + SQL normalize).

create table if not exists public.country_aliases (
  alias text primary key,
  iso2 char(2) not null
    check (iso2 ~ '^[A-Z]{2}$'),
  note text
);

comment on table public.country_aliases is 'Maps import/raw country strings to ISO 3166-1 alpha-2; lookup key is upper(trim(raw)).';

alter table public.country_aliases enable row level security;

drop policy if exists "country_aliases_select_public" on public.country_aliases;
create policy "country_aliases_select_public"
  on public.country_aliases
  for select
  using (true);

grant select on public.country_aliases to anon, authenticated;

insert into public.country_aliases (alias, iso2, note) values
  ('', 'XX', 'empty'),
  ('0', 'XX', 'junk'),
  ('X', 'XX', 'junk'),
  ('XX', 'XX', 'unknown'),
  ('INDIVIDUAL', 'XX', 'not a country'),
  ('GERMANY', 'DE', null),
  ('FRANCE', 'FR', null),
  ('BRASIL', 'BR', null),
  ('AUSTRIA', 'AT', null),
  ('CROATIA', 'HR', null),
  ('CZECH REPUBLIC', 'CZ', null),
  ('ITALY', 'IT', null),
  ('SWITZERLAND', 'CH', null),
  ('AUSTRALIA', 'AU', null),
  ('ROMANIA', 'RO', null),
  ('DENMARK', 'DK', null),
  ('UAE', 'AE', null),
  ('CHINA', 'CN', null),
  ('CANADA', 'CA', null),
  ('BELGIUM', 'BE', null),
  ('ESPANA', 'ES', null),
  ('POLAND', 'PL', null),
  ('BULGARIA', 'BG', null),
  ('BELARUS', 'BY', null),
  ('RUSSIA', 'RU', null),
  ('SERBIA', 'RS', null),
  ('QATAR', 'QA', null),
  ('QAT', 'QA', 'alpha-3'),
  ('HUNGARY', 'HU', null),
  ('USA', 'US', null),
  ('SLOVENIA', 'SI', null),
  ('SLOVENIJA', 'SI', null),
  ('OMAN', 'OM', null),
  ('TURKEY', 'TR', null),
  ('BAHREIN', 'BH', null),
  ('BAHRAIN', 'BH', null),
  ('BIH', 'BA', null),
  ('KOREA', 'KR', null),
  ('EGYPT', 'EG', null),
  ('SLOVAKIA', 'SK', null),
  ('CHN', 'CN', null),
  ('INDONESIA', 'ID', null),
  ('NETHERLANDS', 'NL', null),
  ('KAZAHSTAN', 'KZ', null),
  ('UKRAINA', 'UA', null),
  ('MAROCO', 'MA', null),
  ('ALGERIA', 'DZ', null),
  ('GREAT BRITAIN', 'GB', null),
  ('GREAT BRITAN', 'GB', 'typo'),
  ('LITHUANIA', 'LT', null),
  ('PORTUGAL', 'PT', null),
  ('THAILAND', 'TH', null),
  ('MONTENEGRO', 'ME', null),
  ('SWEEDEN', 'SE', 'typo Sweden'),
  ('FINLAND', 'FI', null),
  ('LATVIA', 'LV', null),
  ('MOLDOVA', 'MD', null),
  ('ARGENTINA', 'AR', null),
  ('LYBIA', 'LY', null),
  ('LYLIBA', 'LY', null),
  ('MONGOLIA', 'MN', null),
  ('MGL', 'MN', null),
  ('NORTH MACEDONIA', 'MK', null),
  ('SRI', 'LK', null),
  ('JORDAN', 'JO', null),
  ('BRUNEI', 'BN', null),
  ('KSA', 'SA', null),
  ('SA', 'SA', null),
  ('PALESTINE', 'PS', null),
  ('VENEZUELA', 'VE', null),
  ('ECU', 'EC', null),
  ('TUNIS', 'TN', null),
  ('KUWAIT', 'KW', null),
  ('NETHERLAND', 'NL', 'typo'),
  ('IDN', 'ID', null),
  ('IND', 'IN', null),
  ('RSA', 'ZA', null),
  ('AUTRALIA', 'AU', 'typo'),
  ('BRN', 'BN', null),
  ('IRI', 'IR', null),
  ('SERBIA & MONTENEGRO', 'XX', 'historical'),
  ('YUGOSLAVIA', 'XX', 'historical'),
  ('SPAIN', 'ES', null)
on conflict (alias) do update set
  iso2 = excluded.iso2,
  note = coalesce(excluded.note, public.country_aliases.note);

-- Every distinct iso2 maps to itself (canonical codes stay valid after normalize).
insert into public.country_aliases (alias, iso2)
select distinct upper(iso2::text), iso2
from public.country_aliases
on conflict (alias) do nothing;

create or replace function public.normalize_country_to_iso2(raw text)
returns text
language sql
stable
set search_path = public
as $$
  with k as (
    select upper(trim(coalesce(raw, ''))) as a
  )
  select case
    when (select a from k) = '' then 'XX'::text
    when exists (select 1 from public.country_aliases ca where ca.alias = (select a from k))
      then (select ca.iso2::text from public.country_aliases ca where ca.alias = (select a from k) limit 1)
    when (select length(a) from k) = 2 and (select a from k) ~ '^[A-Z]{2}$'
      then (select a from k)
    else null::text
  end;
$$;

comment on function public.normalize_country_to_iso2(text) is
  'Maps alias or 2-letter code to ISO 3166-1 alpha-2; empty -> XX; unknown -> NULL.';

grant execute on function public.normalize_country_to_iso2(text) to anon, authenticated, service_role;
