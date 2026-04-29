"""
Compare WALARIN.csv (Excel ground truth) with Supabase competition_results
to validate the import + formula calculation pipeline.
"""
import csv
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

WALARIN_CSV = os.path.join(
    os.path.dirname(__file__), "..", "local", "docs", "walar-spec", "extracted", "WALARIN.csv"
)

try:
    import psycopg2
except ImportError:
    sys.exit("psycopg2 not installed")


def _req_env(k: str) -> str:
    v = os.environ.get(k, "")
    if not v:
        sys.exit(f"{k} is not set")
    return v


def _connect():
    return psycopg2.connect(
        host=os.environ.get("WALAR_PGHOST", "aws-1-eu-west-1.pooler.supabase.com"),
        port=int(os.environ.get("WALAR_PGPORT", "6543")),
        dbname=os.environ.get("WALAR_PGDB", "postgres"),
        user=os.environ.get("WALAR_PGUSER", "postgres.kfbnnlfxsehuswzezcpj"),
        password=_req_env("PGPASSWORD"),
        sslmode="require",
    )


def _safe_float(v: str) -> float | None:
    if not v or v.startswith("#") or v in {"/", "-", ""}:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def main():
    # ---- Load Excel expectations from WALARIN.csv ----
    excel_rows: list[dict] = []
    with open(WALARIN_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            comp = (row.get("Uniqe Competition") or "").strip()
            name = (row.get("Competitor") or "").strip()
            if not comp or not name:
                continue
            score = _safe_float(row.get("WALAR score", ""))
            rating = _safe_float(row.get("WALAR rating", ""))
            rank_pts = _safe_float(row.get("Rank points", ""))
            result_pts = _safe_float(row.get("Results points", ""))
            excel_rows.append({
                "comp": comp,
                "name": name,
                "score": score,
                "rating": rating,
                "rank_pts": rank_pts,
                "result_pts": result_pts,
            })

    print(f"Excel rows loaded: {len(excel_rows)}")
    excel_with_score = [r for r in excel_rows if r["score"] is not None and r["score"] > 0]
    print(f"Excel rows with score > 0: {len(excel_with_score)}")

    # ---- Load DB results ----
    conn = _connect()
    cur = conn.cursor()
    cur.execute("""
        select
            c.unique_label,
            a.display_name,
            cr.wal_ar_score,
            cr.walar_rating,
            cr.rank_points,
            cr.results_points
        from public.competition_results cr
        join public.competitions c on c.id = cr.competition_id
        join public.athletes a on a.id = cr.athlete_id;
    """)
    db_rows = cur.fetchall()
    conn.close()

    db_map: dict[tuple[str, str], dict] = {}
    for label, name, score, rating, rank_pts, res_pts in db_rows:
        key = (label.strip(), name.strip())
        db_map[key] = {
            "score": float(score) if score is not None else None,
            "rating": float(rating) if rating is not None else None,
            "rank_pts": float(rank_pts) if rank_pts is not None else None,
            "result_pts": float(res_pts) if res_pts is not None else None,
        }

    print(f"DB results loaded: {len(db_map)}")
    print()

    # ---- Per-result comparison ----
    matched = 0
    score_mismatches: list[dict] = []
    not_in_db = 0
    both_zero = 0

    for ex in excel_with_score:
        key = (ex["comp"], ex["name"])
        db = db_map.get(key)
        if db is None:
            not_in_db += 1
            continue
        ex_score = ex["score"] or 0
        db_score = db["score"] or 0
        if abs(ex_score - db_score) < 0.5:
            matched += 1
        else:
            score_mismatches.append({
                "comp": ex["comp"],
                "name": ex["name"],
                "excel_score": ex_score,
                "db_score": db_score,
                "excel_rating": ex["rating"],
                "db_rating": db["rating"],
                "excel_rank": ex["rank_pts"],
                "db_rank": db["rank_pts"],
                "excel_res": ex["result_pts"],
                "db_res": db["result_pts"],
            })

    total_compared = matched + len(score_mismatches)
    pct = (matched / total_compared * 100) if total_compared > 0 else 0

    print("=" * 70)
    print("PER-RESULT SCORE COMPARISON (Excel vs DB)")
    print("=" * 70)
    print(f"  Compared:    {total_compared}")
    print(f"  Matched:     {matched}  ({pct:.1f}%)")
    print(f"  Mismatched:  {len(score_mismatches)}")
    print(f"  Not in DB:   {not_in_db}")
    print()

    if score_mismatches:
        print(f"First {min(30, len(score_mismatches))} mismatches:")
        print(f"  {'Competition':<35} {'Athlete':<25} {'ExScore':>8} {'DbScore':>8} {'ExRat':>6} {'DbRat':>6} {'ExRnk':>6} {'DbRnk':>6} {'ExRes':>6} {'DbRes':>6}")
        print("  " + "-" * 140)
        for m in score_mismatches[:30]:
            print(f"  {m['comp']:<35} {m['name']:<25} {m['excel_score']:>8.1f} {m['db_score']:>8.1f} {(m['excel_rating'] or 0):>6.1f} {(m['db_rating'] or 0):>6.1f} {(m['excel_rank'] or 0):>6.0f} {(m['db_rank'] or 0):>6.0f} {(m['excel_res'] or 0):>6.0f} {(m['db_res'] or 0):>6.0f}")
        print()

    # ---- Leaderboard comparison (WALARIN competitions only) ----
    excel_comps = {r["comp"] for r in excel_rows}

    print("=" * 70)
    print("LEADERBOARD COMPARISON (WALARIN competitions only)")
    print("=" * 70)

    excel_lb: dict[str, float] = defaultdict(float)
    for ex in excel_rows:
        s = ex["score"]
        if s is not None and s > 0:
            excel_lb[ex["name"]] += s

    db_lb_filtered: dict[str, float] = defaultdict(float)
    for (label, name), vals in db_map.items():
        if label not in excel_comps:
            continue
        s = vals["score"]
        if s is not None and s > 0:
            db_lb_filtered[name] += s

    excel_top = sorted(excel_lb.items(), key=lambda x: -x[1])[:30]

    print(f"\n  {'#':>3} {'Athlete':<30} {'Excel':>10} {'DB':>10} {'Diff':>10} {'Match':>6}")
    print("  " + "-" * 80)
    lb_ok = 0
    lb_mismatch = 0
    for i, (name, ex_total) in enumerate(excel_top, 1):
        db_total = db_lb_filtered.get(name, 0)
        diff = db_total - ex_total
        ok = abs(diff) < 1
        if ok:
            lb_ok += 1
        else:
            lb_mismatch += 1
        print(f"  {i:>3} {name:<30} {ex_total:>10.1f} {db_total:>10.1f} {diff:>+10.1f} {'OK' if ok else 'DIFF':>6}")

    print()
    print(f"  Top-30 leaderboard: {lb_ok} OK, {lb_mismatch} differ")

    # ---- Full DB leaderboard (all data, top 20) ----
    print()
    print("=" * 70)
    print("FULL DB LEADERBOARD (all competitions, top 20)")
    print("=" * 70)

    db_lb_all: dict[str, float] = defaultdict(float)
    for (label, name), vals in db_map.items():
        s = vals["score"]
        if s is not None and s > 0:
            db_lb_all[name] += s

    db_top = sorted(db_lb_all.items(), key=lambda x: -x[1])[:20]
    print(f"\n  {'#':>3} {'Athlete':<30} {'Total':>10}")
    print("  " + "-" * 50)
    for i, (name, total) in enumerate(db_top, 1):
        print(f"  {i:>3} {name:<30} {total:>10.1f}")
    print()


if __name__ == "__main__":
    main()
