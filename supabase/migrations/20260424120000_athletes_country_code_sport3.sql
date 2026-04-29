-- Canonicalize athletes.country_code to sport/IOC 3-letter codes (e.g. CRO/GER/ITA),
-- while keeping country_aliases + normalize_country_to_iso2 as the raw->ISO2 normalizer.

-- 1) Ensure every athlete has ISO2 first (handles legacy alpha-3 / names via aliases table).
update public.athletes
set country_code = public.normalize_country_to_iso2(country_code)::text;

do $$
begin
  if exists (select 1 from public.athletes where country_code is null limit 1) then
    raise exception 'athletes_country_code_sport3: country_code NULL after normalize — extend public.country_aliases';
  end if;
end $$;

-- 2) ISO2 -> sport3 mapping table (single source for Edge + migrations)
create table if not exists public.country_sport_codes (
  iso2 char(2) primary key check (iso2 ~ '^[A-Z]{2}$'),
  sport3 char(3) not null unique check (sport3 ~ '^[A-Z]{3}$')
);

comment on table public.country_sport_codes is
  'Maps ISO 3166-1 alpha-2 to sport/IOC 3-letter codes; used for canonical athletes.country_code (sport3) and flag URL rendering (sport3 -> iso2).';

alter table public.country_sport_codes enable row level security;

drop policy if exists "country_sport_codes_select_public" on public.country_sport_codes;
create policy "country_sport_codes_select_public"
  on public.country_sport_codes
  for select
  using (true);

grant select on public.country_sport_codes to anon, authenticated;

-- 3) Seed map (mirrors web-next3/src/lib/sportCountryCode.ts)
insert into public.country_sport_codes (iso2, sport3) values
  ('AF','AFG'), ('AL','ALB'), ('DZ','ALG'), ('AD','AND'), ('AO','ANG'), ('AG','ANT'),
  ('AR','ARG'), ('AM','ARM'), ('AU','AUS'), ('AT','AUT'), ('AZ','AZE'),
  ('BS','BAH'), ('BH','BRN'), ('BD','BAN'), ('BB','BAR'), ('BY','BLR'), ('BE','BEL'),
  ('BZ','BIZ'), ('BJ','BEN'), ('BT','BHU'), ('BO','BOL'), ('BA','BIH'), ('BW','BOT'),
  ('BR','BRA'), ('BN','BRU'), ('BG','BUL'), ('BF','BUR'),
  ('KH','CAM'), ('CM','CMR'), ('CA','CAN'), ('CV','CPV'), ('CF','CAF'), ('TD','CHA'),
  ('CL','CHI'), ('CN','CHN'), ('CO','COL'), ('KM','COM'), ('CG','CGO'), ('CD','COD'),
  ('CR','CRC'), ('CI','CIV'), ('HR','CRO'), ('CU','CUB'), ('CY','CYP'), ('CZ','CZE'),
  ('DK','DEN'), ('DJ','DJI'), ('DO','DOM'),
  ('EC','ECU'), ('EG','EGY'), ('SV','ESA'), ('ER','ERI'), ('EE','EST'), ('ET','ETH'),
  ('FJ','FIJ'), ('FI','FIN'), ('FR','FRA'),
  ('GA','GAB'), ('GM','GAM'), ('GE','GEO'), ('DE','GER'), ('GH','GHA'), ('GB','GBR'),
  ('GR','GRE'), ('GD','GRN'), ('GT','GUA'), ('GN','GUI'), ('GW','GBS'), ('GY','GUY'),
  ('HT','HAI'), ('HN','HON'), ('HK','HKG'), ('HU','HUN'),
  ('IS','ISL'), ('IN','IND'), ('ID','INA'), ('IR','IRI'), ('IQ','IRQ'), ('IE','IRL'),
  ('IL','ISR'), ('IT','ITA'),
  ('JM','JAM'), ('JP','JPN'), ('JO','JOR'),
  ('KZ','KAZ'), ('KE','KEN'), ('KI','KIR'), ('KP','PRK'), ('KR','KOR'), ('KW','KUW'),
  ('KG','KGZ'),
  ('LA','LAO'), ('LV','LAT'), ('LB','LIB'), ('LS','LES'), ('LR','LBR'), ('LY','LBA'),
  ('LI','LIE'), ('LT','LTU'), ('LU','LUX'),
  ('MK','MKD'), ('MG','MAD'), ('MW','MAW'), ('MY','MAS'), ('MV','MDV'), ('ML','MLI'),
  ('MT','MLT'), ('MH','MHL'), ('MR','MTN'), ('MU','MRI'), ('MX','MEX'), ('FM','FSM'),
  ('MD','MDA'), ('MC','MON'), ('MN','MGL'), ('ME','MNE'), ('MA','MAR'), ('MZ','MOZ'),
  ('MM','MYA'),
  ('NA','NAM'), ('NR','NRU'), ('NP','NEP'), ('NL','NED'), ('NZ','NZL'), ('NI','NCA'),
  ('NE','NIG'), ('NG','NGR'), ('NO','NOR'),
  ('OM','OMA'),
  ('PK','PAK'), ('PW','PLW'), ('PA','PAN'), ('PG','PNG'), ('PY','PAR'), ('PE','PER'),
  ('PH','PHI'), ('PL','POL'), ('PT','POR'),
  ('QA','QAT'),
  ('RO','ROU'), ('RU','RUS'), ('RW','RWA'),
  ('KN','SKN'), ('LC','LCA'), ('VC','VIN'), ('WS','SAM'), ('SM','SMR'), ('ST','STP'),
  ('SA','KSA'), ('SN','SEN'), ('RS','SRB'), ('SC','SEY'), ('SL','SLE'), ('SG','SGP'),
  ('SK','SVK'), ('SI','SLO'), ('SB','SOL'), ('SO','SOM'), ('ZA','RSA'), ('SS','SSD'),
  ('ES','ESP'), ('LK','SRI'), ('SD','SUD'), ('SR','SUR'), ('SZ','SWZ'), ('SE','SWE'),
  ('CH','SUI'), ('SY','SYR'),
  ('TW','TPE'), ('TJ','TJK'), ('TZ','TAN'), ('TH','THA'), ('TL','TLS'), ('TG','TOG'),
  ('TO','TGA'), ('TT','TTO'), ('TN','TUN'), ('TR','TUR'), ('TM','TKM'),
  ('UG','UGA'), ('UA','UKR'), ('AE','UAE'), ('US','USA'), ('UY','URU'), ('UZ','UZB'),
  ('VU','VAN'), ('VE','VEN'), ('VN','VIE'),
  ('YE','YEM'),
  ('ZM','ZAM'), ('ZW','ZIM'),
  ('XX','XXX')
on conflict (iso2) do update set sport3 = excluded.sport3;

-- 4) Convert athletes.country_code from ISO2 to canonical sport3
update public.athletes a
set country_code = c.sport3::text
from public.country_sport_codes c
where c.iso2 = a.country_code::char(2);

-- 5) Enforce canonical format
-- Anything that didn't map to sport3 becomes XXX to satisfy the constraint.
update public.athletes
set country_code = upper(trim(country_code));

update public.athletes
set country_code = 'XXX'
where country_code is null
   or trim(country_code) = ''
   or country_code !~ '^[A-Z]{3}$';

alter table public.athletes
  drop constraint if exists athletes_country_code_sport3_chk;

alter table public.athletes
  add constraint athletes_country_code_sport3_chk
  check (country_code ~ '^[A-Z]{3}$');

