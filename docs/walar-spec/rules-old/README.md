# WALAR rule tables (from Excel `WALAR 2026-01-01.xlsx`)

No personal data — only lookup matrices exported from the workbook.

## `competition_rang.csv`

Maps **competition tier codes** to **WALAR index** used on `WALARIN` (column **I**, "WALAR index"): `=VLOOKUP(H, Rang!$A$2:$C$13, 3, FALSE)`. The third column is **`sort_order`**.

| code    | label | sort_order (Grupa) |
|---------|-------|--------------------|
| WPC     | WPC   | 1                  |
| EPC     | EPC   | 2                  |
| …       | …     | …                  |
| WALAR F | F     | 12                 |

**Note:** Lower `sort_order` = higher-tier event (WPC = 1). That number is the **column index** into **`PointsPlace`** (1..12) for placement rank points, not "larger = stronger".

## `points_place.csv` (export) and `public.walar_points_place`

**Placement rank points** (Excel `WALARIN` column **AW**, "Rank points"):

```excel
=IF(AC>80,"0",INDEX(PointsPlace!$B$4:$M$83, AC, I))
```

- **Row:** finish place (1..80). Excel uses **Place M** (col AC) for males and **Place F** (col AD) for females. Subcategory columns (Place J, MJ, FJ, Master) are informational only — they do NOT feed into the PointsPlace lookup. Falls back to **Place M+F** when the gender-specific column is empty.
- **Column `I`:** WALAR index = `sort_order` from **`competition_rang_code`** on `competitions`.

Regenerate DB seed:

```bash
python scripts/generate_walar_points_place_seed_sql.py > supabase/migrations/20260326110401_walar_points_place_seed.sql
```

(Adjust the output filename if you add a new dated migration.)

## Scoring on `WALARIN` (summary)

| Column (name)   | Role |
|-----------------|------|
| **AV** WALAR rating | NT + junior + avg>10 + WPC → stored as `competition_results.walar_rating` (sum for organizer OP). Clamped to **0..5**. |
| **AW** Rank points  | From **PointsPlace** → `competition_results.rank_points`. |
| **AX** Results points | `INDEX(PointsCM!$C$3:$L$163, X+1, AA)` → `competition_results.results_points`. |
| **AY** WALAR score  | **AW + AX** → `competition_results.wal_ar_score` (public leaderboard sum). |

**FAI licence:** If `athletes.fai_licence` is empty (and admin setting `rank_athletes_without_fai_licence` is false), recalc clears `walar_rating`, `rank_points`, `results_points`, and `wal_ar_score` for that row.

## `points_cm.csv` and DB table `public.walar_points_cm`

**Results points** (column **AX**) come from sheet **PointsCM**, range `C3:L163`.

```excel
=INDEX(PointsCM!$C$3:$L$163, X+1, AA)
```

- **Row:** **Total** cm (sum jumps `N:W` + SF + F), 0..160.
- **Column:** **Jump rounds** 1..10.

## Excel parity check

Run from the project root after extracting CSVs:

```bash
python scripts/export_walar_workbook_all.py     # extract all sheets → docs/walar-spec/extracted/
python scripts/excel_parity_check_walarin.py    # compare WALARIN vs our scoring logic
```

Last verified: **1127/1146 rows match** (98.3%). Remaining 18 mismatches are all "Competitor not in Database" athletes where Excel IFERROR defaults rating to 1; 1 data anomaly (Thomas Saurer SWCS Czech R. — all place columns empty).

## Regenerating CSVs

From the project root (Python + openpyxl; workbook at `docs/walar-spec/WALAR 2026-01-01.xlsx` or set `WALAR_XLSX`):

```bash
python scripts/export_walar_rules.py
```
