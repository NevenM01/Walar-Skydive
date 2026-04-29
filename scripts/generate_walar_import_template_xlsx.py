#!/usr/bin/env python3
"""Legacy minimal template generator.

Canonical template (TB rounds, places, hints): run `python scripts/generate_template_xlsx.py` instead.
This script overwrites the same output path with a smaller column set."""

from __future__ import annotations

from datetime import date
from pathlib import Path

try:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
except ImportError as e:
    raise SystemExit("Install openpyxl: pip install openpyxl") from e

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "walar-results-import.template.xlsx"

HEADERS = [
    "Competition label",
    "First name",
    "Last name",
    "Country code",
    "Gender",
    "GDPR consent",
    "Publish full name",
    "National team member",
    "Date of birth",
    "WPC medalist",
    "Jump 1",
    "Jump 2",
    "Jump 3",
    "Jump 4",
    "Jump 5",
    "Jump 6",
    "Jump 7",
    "Jump 8",
    "SF cm",
    "F cm",
    "Start number",
    "Team",
]

SAMPLE = [
    "2025 WALAR Cup Grobnik",
    "CSV",
    "Test Athlete",
    "HR",
    "M",
    True,
    True,
    False,
    date(1988, 4, 12),
    False,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    3,
    101,
    "Team A",
]


def main() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Results"

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1e3a5f")
    for col, title in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col, value=title)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col, val in enumerate(SAMPLE, start=1):
        ws.cell(row=2, column=col, value=val)

    for row in range(3, 42):
        for col in range(1, len(HEADERS) + 1):
            ws.cell(row=row, column=col, value=None)

    ws.freeze_panes = "A2"
    for col in range(1, len(HEADERS) + 1):
        letter = ws.cell(row=1, column=col).column_letter
        ws.column_dimensions[letter].width = min(18, max(10, len(HEADERS[col - 1]) + 2))

    ws2 = wb.create_sheet("How to use", 1)
    lines = [
        "WALAR results upload template",
        "",
        "1. One row per athlete. Competition label must match unique_label in the app.",
        "2. First name and Last name in separate columns (stored together as display name).",
        "3. Date of birth: YYYY-MM-DD (or Excel date). Age class (junior / senior / master) is computed from DOB and the competition end date.",
        "4. Gender: M or F. Booleans: true/false or yes/no.",
        "5. Jump columns = distance in cm (numbers). Leave blank if not used.",
        "6. Place columns are optional in the import flow; if left empty, placements are derived from totals.",
        "7. Upload this .xlsx on Admin → Results import.",
        "",
        "Edit only the Results sheet; keep row 1 as headers.",
    ]
    for i, line in enumerate(lines, start=1):
        ws2.cell(row=i, column=1, value=line)
    ws2.column_dimensions["A"].width = 92

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
