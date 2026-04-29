"""Export PointsCM + Rang from the WALAR Excel workbook to docs/walar-spec/rules/."""

from __future__ import annotations

import csv
import os
from pathlib import Path

from openpyxl import load_workbook

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = REPO_ROOT / "docs" / "walar-spec" / "WALAR 2026-01-01.xlsx"
OUT_DIR = REPO_ROOT / "docs" / "walar-spec" / "rules"


def main() -> None:
    path = Path(os.environ.get("WALAR_XLSX", DEFAULT_XLSX))
    if not path.is_file():
        raise SystemExit(f"Workbook not found: {path}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    wb = load_workbook(path, data_only=True, read_only=True)

    def sheet_to_csv(name: str, outfile: Path, *, max_row: int | None = None, max_col: int | None = None) -> None:
        ws = wb[name]
        with outfile.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, delimiter=";")
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if max_row is not None and i >= max_row:
                    break
                cells = list(row)
                if max_col is not None:
                    cells = cells[:max_col]
                w.writerow(["" if v is None else v for v in cells])

    sheet_to_csv("PointsCM", OUT_DIR / "points_cm.csv", max_row=200, max_col=20)
    sheet_to_csv("Rang", OUT_DIR / "competition_rang.csv", max_row=30, max_col=10)
    sheet_to_csv("PointsPlace", OUT_DIR / "points_place.csv", max_row=90, max_col=20)
    wb.close()
    print(f"Wrote CSVs to {OUT_DIR}")


if __name__ == "__main__":
    main()
