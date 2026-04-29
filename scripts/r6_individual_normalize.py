#!/usr/bin/env python3
"""
Normalize SkyLab R6 export "Individual all" CSV:
- One data row per athlete (skip title blocks, repeated headers, page footers).
- Split NAME into first_name (first token) and last_name (remaining tokens).

Usage:
  python scripts/r6_individual_normalize.py "path/to/R6 - Individual all.csv" [output.csv]

If output is omitted, writes next to input as "<stem>-one-row-per-athlete.csv".
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path


def split_name(full: str) -> tuple[str, str]:
    full = full.strip()
    if not full:
        return "", ""
    parts = full.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def is_data_row(cells: list[str]) -> bool:
    if len(cells) < 14:
        return False
    pos = cells[0].strip()
    if not pos.isdigit():
        return False
    sn = cells[1].strip()
    if not re.match(r"^\d+[A-Za-z]$", sn):
        return False
    name = cells[2].strip()
    if not name:
        return False
    first = cells[0].strip().lower()
    if first in ("pos", "page"):
        return False
    return True


def normalize_r6_individual_rows(rows: list[list[str]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen_sn: set[str] = set()

    for cells in rows:
        if not cells or all(not c.strip() for c in cells):
            continue
        if cells[0].strip().lower() == "pos" and len(cells) > 2 and cells[2].strip().upper() == "NAME":
            continue
        if cells[0].strip().lower().startswith("page "):
            continue
        if not is_data_row(cells):
            continue

        sn = cells[1].strip()
        if sn in seen_sn:
            continue
        seen_sn.add(sn)

        first, last = split_name(cells[2])
        out.append(
            {
                "pos": cells[0].strip(),
                "sn": sn,
                "first_name": first,
                "last_name": last,
                "full_name": cells[2].strip(),
                "team": cells[3].strip(),
                "nat": cells[4].strip(),
                "gender": cells[5].strip(),
                "cat": cells[6].strip(),
                "r1": cells[7].strip(),
                "r2": cells[8].strip(),
                "r3": cells[9].strip(),
                "r4": cells[10].strip(),
                "r5": cells[11].strip(),
                "r6": cells[12].strip(),
                "total": cells[13].strip(),
            }
        )
    return out


def read_semicolon_csv(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    # Normalise newlines
    lines = text.splitlines()
    rows: list[list[str]] = []
    for line in lines:
        reader = csv.reader([line], delimiter=";", quotechar='"')
        try:
            row = next(reader)
        except StopIteration:
            continue
        rows.append(row)
    return rows


def write_semicolon_csv(path: Path, records: list[dict[str, str]]) -> None:
    fieldnames = [
        "pos",
        "sn",
        "first_name",
        "last_name",
        "full_name",
        "team",
        "nat",
        "gender",
        "cat",
        "r1",
        "r2",
        "r3",
        "r4",
        "r5",
        "r6",
        "total",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";", lineterminator="\n")
        w.writeheader()
        w.writerows(records)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    inp = Path(sys.argv[1])
    if not inp.is_file():
        print(f"Not a file: {inp}", file=sys.stderr)
        return 1
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else inp.with_name(f"{inp.stem}-one-row-per-athlete.csv")

    raw = read_semicolon_csv(inp)
    records = normalize_r6_individual_rows(raw)
    write_semicolon_csv(out, records)
    print(f"Wrote {len(records)} row(s) to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
