# Supabase (WALAR)

## Migracije

SQL datoteke u `migrations/` primijeni **redom** na svoj Supabase projekt:

| Datoteka | Sadržaj |
|----------|---------|
| `20260324120000_initial_schema.sql` | `profiles`, `competitions`, osnovni RLS |
| `20260325100000_fix_profiles_select_rls.sql` | `jwt_is_app_admin`, ispravak rekurzije na `profiles` |
| `20260326110000_walar_core_schema.sql` | `walar_competition_rang`, `walar_points_cm` (+ seed), `athletes`, `competition_results`, funkcije `walar_*`, RLS za organizatore |
| `20260326110400_walar_excel_parity.sql` | `walar_points_place`, stupci `walar_rating` + plasmani na `competition_results`, `walar_placement_points_lookup`, Excel AY = AW+AX, OP = sum(`walar_rating`) |
| `20260326110401_walar_points_place_seed.sql` | seed matrice **PointsPlace** (regeneriraj: `python scripts/generate_walar_points_place_seed_sql.py`) |
| `20260326110500_leaderboard_rpc.sql` | `get_leaderboard(...)` za javni ranking (5 godina, GDPR) |
| `20260326110600_demo_leaderboard_seed.sql` | demo sportaši + rezultati (opcionalno ukloniti) |
| `20260327120000_walar_admin_recalc_rpc.sql` | `walar_admin_recalculate_competition`, `walar_admin_recalculate_all_results` (admin RPC) |
| `20260328120000_walar_news_posts.sql` | tablica `walar_news_posts` + RLS (stranica **News** / admin novosti) |
| `20260329130000_walar_news_posts_media_author.sql` | `author_name`, `image_urls`, Storage bucket `news-images` |
| `20260329140000_walar_age_category_from_dob.sql` | `walar_age_category_from_dates`, dobna kategorija iz `athletes.date_of_birth` + `competitions.end_date` pri preračunu |
| `20260330150000_ensure_competitions_unique_label.sql` | Samo `competitions.unique_label` + indeks (idempotentno, ako je ostala WALAR migracija preskočena) |
| `20260331150000_walar_news_posts_body.sql` | `walar_news_posts.body` (puni tekst članka) |
| `20260331210000_walar_recalculate_points_without_fai_licence.sql` | FAI logika (superseded dijelom u sljedećoj) |
| `20260402120000_walar_app_settings_rank_without_fai.sql` | `walar_app_settings` + `walar_app_setting_boolean`; `walar_recalculate_competition_result` po zastavici **Rank athletes without FAI licence** (Admin → **Settings** ili **Ranking**, default **on**) |
| `20260403090000_walar_athletes_dob_display_mode.sql` | Način prikaza datuma rođenja na profilu |
| `20260404100000_walar_news_title_locale_en.sql` | Ažuriranje naslova novosti na engleski (idempotentan `UPDATE`) |
| `20260405100000_walar_excel_parity_fix.sql` | `walar_rank_points` 0..5, `walar_effective_place_for_points` M/F kao Excel |
| `20260406120000_competition_results_tb_rounds.sql` | Opcionalni stupci `tb1_cm` … `tb6_cm` (tie-break, ne ulaze u PointsCM zbroj) |
| `20260407100000_get_leaderboard_place_tiebreak.sql` | `get_leaderboard`: pri filtru jednog natjecanja izjednačenja po plasmanu, pa imenu |

### Produkcijski projekt (već deployan drugačijim verzijama)

Na live Supabaseu povijest u `supabase_migrations.schema_migrations` može imati **druge** `version` nazive (npr. `walar_excel_parity_part1` / `part2` umjesto jedne `20260326110400` datoteke) — sadržaj je usklađen, samo su datoteke u repou **kanonski redoslijed** za novi `supabase db reset` / push. Nakon dodavanja novih migracija u repou, na postojećem projektu pokreni isti SQL (SQL Editor ili `supabase db push` ako je linkan).

**Dashboard:** SQL Editor → zalijepi svaku migraciju po redu → Run.  
**CLI:** `supabase db push`

### Greška: `Could not find the table 'public.walar_news_posts' in the schema cache`

To znači da migracija novosti **nije** izvršena na tom Supabase projektu. Rješenje:

1. Otvori **Supabase Dashboard** → **SQL Editor** → **New query**.
2. Kopiraj **cijeli sadržaj** datoteke `migrations/20260328120000_walar_news_posts.sql` i pokreni (**Run**).
3. Zatim na isti način pokreni `migrations/20260329130000_walar_news_posts_media_author.sql` (autor, slike, bucket).
4. Pričekaj nekoliko sekundi (schema cache se osvježi) i osvježi admin stranicu **News**.

`jwt_is_app_admin()` mora već postojati (migracija `20260325100000_fix_profiles_select_rls.sql`).

### Javni Leaderboard u aplikaciji ne učitava / „Failed to load ranking“

Web poziva RPC **`get_leaderboard`**. Ako ta funkcija **nije** na projektu (npr. primijenjene su samo dijelomične SQL skripte), PostgREST će vratiti grešku.

**Rješenje:** u SQL Editoru pokreni cijeli sadržaj `migrations/20260326110500_leaderboard_rpc.sql`, pričekaj par sekundi i osvježi stranicu Leaderboard.

### Leaderboard je prazan nakon uspješnog uvoza

Javni `get_leaderboard` broji samo retke gdje je **`competition_results.wal_ar_score` nije null** i gdje sportaš ima **`athletes.gdpr_consent_given = true`**, a natjecanje pada u **klizni prozor** (npr. zadnjih 5 godina po `competitions.end_date`).

- Ako u importu **nema FAI licence** i u **Admin → Settings** je opcija **Rank athletes without FAI licence** **isključena**, `wal_ar_score` ostaje **null** → taj sportaš ne ulazi u javni ranking. Kad je opcija **uključena** (default), bodovi se računaju i bez FAI broja. Nakon promjene postavke pokreni **Admin → Ranking → Recalculate all**.
- Provjeri u tablici `athletes` da je **`gdpr_consent_given`** true za uvezene redove (stupac je obavezan u CSV predlošku).

### Greška pri uvozu: `column competitions.unique_label does not exist`

Početna migracija (`20260324120000_initial_schema.sql`) **ne** sadrži stupac `unique_label` na `competitions`. On se dodaje u **`20260326110000_walar_core_schema.sql`**. Ako ta datoteka nije pokrenuta na projektu, Excel/CSV uvoz koji koristi *Competition label* puca s tom porukom.

**Brzo rješenje:** u SQL Editoru pokreni cijeli sadržaj `migrations/20260330150000_ensure_competitions_unique_label.sql` (dodaje samo stupac i indeks, sigurno je ponovno pokrenuti). Za puni WALAR (athletes, results, funkcije) i dalje treba **`20260326110000_walar_core_schema.sql`** i ostale migracije redom.

Operativni upit: **`../scripts/ops_report_competitions_missing_rang.sql`** — natjecanja bez `competition_rang_code`.

Pravila i lookup tablice (PointsCM / Rang) opisane su u [`docs/walar-spec/rules/README.md`](../docs/walar-spec/rules/README.md).

## Frontend env (`web/`)

Kopiraj `web/.env.example` u `web/.env.local` i unesi:

- `VITE_SUPABASE_URL` — Project Settings → API → Project URL  
- `VITE_SUPABASE_ANON_KEY` — `anon` `public` key  

Bez ovih varijabli aplikacija se učitava, ali neće prikazivati podatke (prazna stanja) dok se Supabase ne poveže.

## Authentication (email + lozinka)

1. Supabase Dashboard → **Authentication** → **Providers** → **Email** — ostavi uključeno (default).
2. **Authentication** → **Users** → **Add user** — unesi email i lozinku (ili se registriraj kroz aplikaciju ako uključiš sign-up).
3. Prijava u aplikaciji: **Sign in** na `/login`, ili **Admin** u navigaciji (vodi na login s redirectom na `/admin`).

## Prvi admin

Nakon što postoji korisnik u **Authentication → Users**, u SQL Editoru:

```sql
update public.profiles
set is_admin = true, role = 'admin'
where id = '<uuid-from-auth-users>';
```

Zatim može dodavati/uređivati natjecanja kroz aplikaciju (kad admin CRUD bude spojen na Supabase).
