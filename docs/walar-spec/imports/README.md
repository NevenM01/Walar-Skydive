## Bulk importing 80+ event workbooks

This repo supports importing data from the standard WALAR Excel template into Supabase.

### 0) Prerequisites

- Python installed
- `openpyxl` available (used by `scripts/export_walar_workbook_all.py`)
- Supabase DB credentials available for the import script (see `scripts/.import_db.env`)

### 1) Export each `.xlsx` to CSV (evaluated values)

`scripts/export_walar_workbook_all.py` exports **all sheets** from a workbook into
`docs/walar-spec/extracted/` using `data_only=True` (formula results as stored in the workbook).

For 80+ workbooks, run this PowerShell from the repository root.
It exports each workbook and copies the produced CSVs into a per-workbook folder.

```powershell
$imports = "D:\Walar Skydive\walar_imports"
$repoRoot = (Get-Location).Path
$extracted = Join-Path $repoRoot "docs\walar-spec\extracted"
$outRoot = Join-Path $imports "_extracted_csv"

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null

Get-ChildItem $imports -Filter *.xlsx | ForEach-Object {
  $name = $_.BaseName
  $dest = Join-Path $outRoot $name
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  $env:WALAR_XLSX = $_.FullName
  python scripts/export_walar_workbook_all.py

  Copy-Item "$extracted\*.csv" $dest -Force
  Copy-Item "$extracted\workbook_summary.json" $dest -Force
}
```

### 2) Build the 3 master CSVs for import

`scripts/db_bulk_import_master.py` expects exactly:

- `docs/walar-spec/extracted/Athletes.csv`
- `docs/walar-spec/extracted/CompetitionsRanking.csv`
- `docs/walar-spec/extracted/WALARIN.csv`

If your workbook template uses the same sheet names as the canonical workbook, you can:

1. From each workbook’s exported folder, pick the CSV that corresponds to:
   - Athletes → `Athletes.csv`
   - Competitions ranking → `CompetitionsRanking.csv`
   - Results sheet → `WALARIN.csv`
2. Append all rows **without repeating headers** into the 3 master files above.

Tip: use the first workbook as the “header source”, then append only data rows from the rest.

### 3) Run the DB bulk import

From repo root:

```bash
python scripts/db_bulk_import_master.py --truncate
```

Notes:
- Use `--truncate` only when you want a clean reset (drops existing athletes/competitions/results).
- The import script performs recalculation after inserting results.

