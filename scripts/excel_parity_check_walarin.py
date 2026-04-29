"""Parity-check WALARIN sheet exports against the implemented scoring logic.

Inputs:
- local/docs/walar-spec/extracted/WALARIN.csv
- local/docs/walar-spec/extracted/PointsCM.csv
- local/docs/walar-spec/extracted/PointsPlace.csv

This script recomputes:
- WALAR rating (rank factor points) [AV]
- placement rank points [AW]
- results points [AX]
- WALAR score [AY = AW + AX]
and compares against the exported WALARIN values.
"""

from __future__ import annotations

import csv
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = REPO_ROOT / "local" / "docs" / "walar-spec" / "extracted"


def _as_bool(v: Any) -> bool:
    s = str(v).strip().upper()
    return s in {"1", "TRUE", "YES", "Y"}


def _as_float_or_none(v: Any) -> float | None:
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s == "/" or s.upper() == "#N/A":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _as_int_or_none(v: Any) -> int | None:
    f = _as_float_or_none(v)
    if f is None:
        return None
    return int(round(f))


@dataclass(frozen=True)
class JumpTotals:
    total_cm: float
    jump_rounds: int
    avg_cm: float | None


def walar_jump_totals(*vals: float | None) -> JumpTotals:
    nums = [v for v in vals if v is not None and not math.isnan(v)]
    if not nums:
        return JumpTotals(total_cm=0.0, jump_rounds=0, avg_cm=None)
    total = float(sum(nums))
    return JumpTotals(total_cm=total, jump_rounds=len(nums), avg_cm=total / len(nums))


def walar_rank_points(*, member_national_team: bool, age_category: str | None, avg_cm: float | None, wpc_medalist: bool) -> int:
    cat = (age_category or "").strip().lower()
    p = 3 if member_national_team else 1
    if cat == "junior":
        p += 1
    if (avg_cm or 0) > 10:
        p -= 1
    if wpc_medalist:
        p += 2
    return max(0, min(5, p))


def walar_effective_place_for_points(
    *,
    gender: str | None,
    age_category: str | None,
    place_overall: int | None,
    place_m: int | None,
    place_f: int | None,
    place_j: int | None,
    place_mj: int | None,
    place_fj: int | None,
    place_master: int | None,
) -> int | None:
    g = (gender or "").strip().upper()
    if g == "F":
        if place_f is not None:
            return place_f
        return place_overall
    if place_m is not None:
        return place_m
    return place_overall


def load_points_cm_matrix(path: Path) -> dict[tuple[int, int], int]:
    # PointsCM!C3:L163 where columns represent jump rounds 1..10, rows total_cm 0..160.
    # Our export includes the whole sheet; we rely on the standard layout:
    # - header row at 2 (1-indexed) with rounds
    # - totals in column B or A depending on workbook
    # We implement a tolerant parser: detect round headers 1..10 and total labels 0..160.
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f, delimiter=";"))

    # Find header row containing rounds 1..10
    header_i = None
    for i, r in enumerate(rows[:10]):
        ints = [int(x) for x in r if str(x).strip().isdigit()]
        if set(range(1, 11)).issubset(set(ints)):
            header_i = i
            break
    if header_i is None:
        raise SystemExit(f"Could not find rounds header row in {path}")

    header = rows[header_i]
    round_col: dict[int, int] = {}
    for ci, v in enumerate(header):
        s = str(v).strip()
        if s.isdigit():
            j = int(s)
            if 1 <= j <= 10:
                round_col[j] = ci

    matrix: dict[tuple[int, int], int] = {}
    for r in rows[header_i + 1 :]:
        # total is often first numeric cell in row (0..160)
        total = None
        for v in r[:5]:
            if str(v).strip().isdigit():
                total = int(str(v).strip())
                break
        if total is None or not (0 <= total <= 160):
            continue
        for jr, ci in round_col.items():
            if ci >= len(r):
                continue
            val = _as_int_or_none(r[ci])
            if val is None:
                continue
            matrix[(total, jr)] = val
    return matrix


def load_points_place_matrix(path: Path) -> dict[tuple[int, int], int]:
    # PointsPlace!B4:M83: rows place 1..80, cols wal_ar_index 1..12.
    # Export includes full sheet; we detect a row with 1..12 headers and then parse subsequent rows with place.
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f, delimiter=";"))

    header_i = None
    for i, r in enumerate(rows[:20]):
        ints = [int(x) for x in r if str(x).strip().isdigit()]
        if set(range(1, 13)).issubset(set(ints)):
            header_i = i
            break
    if header_i is None:
        raise SystemExit(f"Could not find walArIndex header row in {path}")

    header = rows[header_i]
    idx_col: dict[int, int] = {}
    for ci, v in enumerate(header):
        s = str(v).strip()
        if s.isdigit():
            j = int(s)
            if 1 <= j <= 12:
                idx_col[j] = ci

    matrix: dict[tuple[int, int], int] = {}
    for r in rows[header_i + 1 :]:
        # place is first integer 1..80 in row
        place = None
        for v in r[:5]:
            if str(v).strip().isdigit():
                place = int(str(v).strip())
                break
        if place is None or not (1 <= place <= 80):
            continue
        for idx, ci in idx_col.items():
            if ci >= len(r):
                continue
            val = _as_int_or_none(r[ci])
            if val is None:
                continue
            matrix[(place, idx)] = val
    return matrix


def results_points_lookup(total_cm: float, jump_rounds: int, matrix: dict[tuple[int, int], int]) -> int:
    tc = int(math.floor(max(0, min(160, total_cm))))
    jr = int(max(1, min(10, round(jump_rounds))))
    return matrix.get((tc, jr), 0)


def placement_points_lookup(place: int | None, wal_ar_index: int | None, matrix: dict[tuple[int, int], int]) -> int:
    if place is None or not (1 <= place <= 80):
        return 0
    if wal_ar_index is None or not (1 <= wal_ar_index <= 12):
        return 0
    return matrix.get((place, wal_ar_index), 0)


def _norm_age_category(v: Any) -> str | None:
    s = str(v).strip().lower()
    if s in {"", "/", "#n/a"}:
        return None
    if s.startswith("jun"):
        return "junior"
    if s.startswith("mas"):
        return "master"
    if s.startswith("sen"):
        return "senior"
    return s


def main() -> None:
    # Ensure we can print athlete names with diacritics on Windows consoles.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    walarin_path = EXTRACTED / "WALARIN.csv"
    pcm_path = EXTRACTED / "PointsCM.csv"
    ppl_path = EXTRACTED / "PointsPlace.csv"

    pcm = load_points_cm_matrix(pcm_path)
    ppl = load_points_place_matrix(ppl_path)

    with walarin_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    mismatches: list[str] = []
    not_in_db_mismatches: list[str] = []
    by_type: dict[str, int] = {"rating": 0, "placement": 0, "results": 0, "score": 0}
    checked = 0
    matched = 0
    not_in_db_count = 0

    for r in rows:
        comp = (r.get("Competition") or "").strip()
        competitor = (r.get("Competitor") or "").strip()
        if not comp or not competitor or comp.upper() == "TEST":
            continue

        j1 = _as_float_or_none(r.get("1. "))
        j2 = _as_float_or_none(r.get("2."))
        j3 = _as_float_or_none(r.get("3. "))
        j4 = _as_float_or_none(r.get("4."))
        j5 = _as_float_or_none(r.get("5. "))
        j6 = _as_float_or_none(r.get("6. "))
        j7 = _as_float_or_none(r.get("7."))
        j8 = _as_float_or_none(r.get("8. "))
        sf = _as_float_or_none(r.get("SF"))
        fin = _as_float_or_none(r.get("F"))

        totals = walar_jump_totals(j1, j2, j3, j4, j5, j6, j7, j8, sf, fin)

        gender = (r.get("Gender") or "").strip()
        age_cat = _norm_age_category(r.get("Age category"))
        member_nt = _as_bool(r.get("Member of National Team"))
        wpc_med = _as_bool(r.get("WPC medalist"))

        rating = walar_rank_points(member_national_team=member_nt, age_category=age_cat, avg_cm=totals.avg_cm, wpc_medalist=wpc_med)

        wal_ar_index = _as_int_or_none(r.get("WALAR index"))

        place_overall = _as_int_or_none(r.get("Place M+F"))
        place_m = _as_int_or_none(r.get("Place M"))
        place_f = _as_int_or_none(r.get("Place F"))
        place_j = _as_int_or_none(r.get("Place J"))
        place_mj = _as_int_or_none(r.get("Place MJ"))
        place_fj = _as_int_or_none(r.get("Place FJ"))
        place_master = _as_int_or_none(r.get("Place Master"))

        eff_place = walar_effective_place_for_points(
            gender=gender,
            age_category=age_cat,
            place_overall=place_overall,
            place_m=place_m,
            place_f=place_f,
            place_j=place_j,
            place_mj=place_mj,
            place_fj=place_fj,
            place_master=place_master,
        )

        placement_points = placement_points_lookup(eff_place, wal_ar_index, ppl)
        results_pts = results_points_lookup(totals.total_cm, totals.jump_rounds, pcm)
        score = placement_points + results_pts

        fai_val = (r.get("FAI Licence Validation") or "").strip()
        not_in_db = "not in database" in fai_val.lower()

        excel_rating = _as_int_or_none(r.get("WALAR rating"))
        excel_aw = _as_int_or_none(r.get("Rank points"))
        excel_ax = _as_int_or_none(r.get("Results points"))
        excel_ay = _as_int_or_none(r.get("WALAR score"))

        checked += 1
        if not_in_db:
            not_in_db_count += 1
        row_ok = True
        row_issues: list[str] = []
        if excel_rating is not None and excel_rating != rating:
            by_type["rating"] += 1
            row_issues.append(f"[rating] {comp} | {competitor}: excel={excel_rating} calc={rating} (NT={member_nt}, jr={age_cat}, avg={totals.avg_cm}, med={wpc_med})")
            row_ok = False
        if excel_aw is not None and excel_aw != placement_points:
            by_type["placement"] += 1
            row_issues.append(f"[placement] {comp} | {competitor}: excel={excel_aw} calc={placement_points} (eff_place={eff_place}, idx={wal_ar_index}, g={gender}, cat={age_cat}, pm={place_m}, pf={place_f}, pj={place_j}, pmj={place_mj}, pfj={place_fj}, pmas={place_master}, pall={place_overall})")
            row_ok = False
        if excel_ax is not None and excel_ax != results_pts:
            by_type["results"] += 1
            row_issues.append(f"[results] {comp} | {competitor}: excel={excel_ax} calc={results_pts} (total={totals.total_cm}, rounds={totals.jump_rounds})")
            row_ok = False
        if excel_ay is not None and excel_ay != score:
            by_type["score"] += 1
            row_issues.append(f"[score] {comp} | {competitor}: excel={excel_ay} calc={score} (aw={placement_points}+ax={results_pts})")
            row_ok = False
        if row_ok:
            matched += 1
        elif not_in_db:
            not_in_db_mismatches.extend(row_issues)
        else:
            mismatches.extend(row_issues)

    total_issues = len(mismatches) + len(not_in_db_mismatches)
    print(f"Checked rows: {checked} (of which {not_in_db_count} are 'Competitor not in Database')")
    print(f"Fully matched: {matched}/{checked} ({100*matched/max(1,checked):.1f}%)")
    print(f"Total mismatches: {total_issues}")
    print(f"  Real mismatches (in-DB athletes): {len(mismatches)}")
    print(f"  Expected #N/A mismatches (not-in-DB): {len(not_in_db_mismatches)}")
    for k, v in by_type.items():
        print(f"  {k}: {v}")
    print()
    if mismatches:
        print("=== REAL mismatches (need fixing) ===")
        for line in mismatches:
            print(line)
    print()
    if not_in_db_mismatches:
        print(f"=== Not-in-DB mismatches ({len(not_in_db_mismatches)} — expected, Excel IFERROR default) ===")
        for line in not_in_db_mismatches[:20]:
            print(line)
        if len(not_in_db_mismatches) > 20:
            print(f"... {len(not_in_db_mismatches)-20} more")


if __name__ == "__main__":
    main()

