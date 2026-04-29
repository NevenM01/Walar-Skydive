from __future__ import annotations

import argparse
import csv
import io
import os
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import psycopg2


REPO_ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = REPO_ROOT / "docs" / "walar-spec" / "extracted"
_IMPORT_ENV_FILE = REPO_ROOT / "scripts" / ".import_db.env"


def _load_optional_import_env_file() -> None:
    """If PGPASSWORD is unset, load KEY=value lines from scripts/.import_db.env (gitignored)."""
    if os.environ.get("PGPASSWORD"):
        return
    if not _IMPORT_ENV_FILE.is_file():
        return
    for raw in _IMPORT_ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and val and key not in os.environ:
            os.environ[key] = val


def _req_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise SystemExit(f"{name} is not set")
    return v


def _connect():
    pw = _req_env("PGPASSWORD")
    host = os.environ.get("WALAR_PGHOST", "aws-1-eu-west-1.pooler.supabase.com")
    port = int(os.environ.get("WALAR_PGPORT", "6543"))
    dbname = os.environ.get("WALAR_PGDB", "postgres")
    user = os.environ.get("WALAR_PGUSER", "postgres.kfbnnlfxsehuswzezcpj")
    return psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=pw,
        sslmode="require",
    )


def _parse_date(v: str) -> str | None:
    s = (v or "").strip()
    if not s or s == "/":
        return None
    # Excel error/sentinel values
    su = s.upper()
    if su in {"#N/A", "#ERROR", "#VALUE!", "#REF!", "#DIV/0!", "#NAME?", "#NUM!"}:
        return None
    if s.startswith("#"):
        return None
    # Typical: "1996-11-23 00:00:00" or "1996-11-23"
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", s)
    if not m:
        # Also accept "DD.MM.YYYY" (common in some exports)
        m2 = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", s)
        if not m2:
            return None
        dd, mm, yyyy = m2.group(1), m2.group(2), m2.group(3)
        return f"{yyyy}-{mm}-{dd}"
    return m.group(1)


def _as_bool_yes(v: str) -> bool:
    return (v or "").strip().upper() in {"YES", "Y", "TRUE", "1"}


def _as_gender(v: str) -> str:
    g = (v or "").strip().upper()
    return g if g in {"M", "F"} else "M"


def _clean_text(v: str) -> str:
    s = (v or "").strip()
    if s.upper() == "#N/A":
        return ""
    return s


_VALID_RANG_CODES = {
    "CISM", "EPC", "NC", "SWCS",
    "WALAR A", "WALAR B", "WALAR C", "WALAR D", "WALAR E", "WALAR F",
    "Wcup", "WPC",
}
_RANG_ALIAS = {"WCup": "Wcup", "wcup": "Wcup"}


def _normalize_rang_code(v: str) -> str | None:
    s = _clean_text(v)
    if not s:
        return None
    s = _RANG_ALIAS.get(s, s)
    if s in _VALID_RANG_CODES:
        return s
    return None


def _clean_numeric(v: str) -> str:
    """
    Return a string that Postgres can cast to numeric/int, or '' for NULL.
    Handles Excel artifacts like #DIV/0!, '/', '#N/A'.
    """
    s = _clean_text(v)
    if not s or s == "/":
        return ""
    if s.upper() in {"#DIV/0!", "#VALUE!", "#REF!", "#NUM!", "#NAME?"}:
        return ""
    # accept numbers with optional decimals
    try:
        float(s)
        return s
    except ValueError:
        return ""


@dataclass(frozen=True)
class Paths:
    athletes_csv: Path
    competitions_csv: Path
    results_csv: Path


def _paths() -> Paths:
    return Paths(
        athletes_csv=EXTRACTED / "Athletes.csv",
        competitions_csv=EXTRACTED / "CompetitionsRanking.csv",
        results_csv=EXTRACTED / "WALARIN.csv",
    )


def _copy_from_rows(cur, table: str, columns: list[str], rows: list[list[str]]) -> None:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    cols = ", ".join(columns)
    cur.copy_expert(f"COPY {table} ({cols}) FROM STDIN WITH (FORMAT csv, DELIMITER ';')", buf)


def main() -> None:
    ap = argparse.ArgumentParser(description="Bulk import WALAR data into Supabase.")
    ap.add_argument(
        "--truncate",
        action="store_true",
        help="Truncate competition_results, competitions, athletes before import.",
    )
    args = ap.parse_args()

    _load_optional_import_env_file()

    p = _paths()
    for fp in (p.athletes_csv, p.competitions_csv, p.results_csv):
        if not fp.is_file():
            raise SystemExit(f"Missing file: {fp}")

    conn = _connect()
    conn.autocommit = False
    cur = conn.cursor()

    if args.truncate:
        print("--truncate: clearing competition_results, competitions, athletes ...")
        cur.execute(
            "truncate public.competition_results, public.competitions, public.athletes restart identity cascade;"
        )

    # TEMP staging tables (dropped on commit).
    cur.execute(
        """
        create temp table stg_athletes (
          display_name text not null,
          country text null,
          gender text not null,
          dob date null,
          fai_licence text null,
          gdpr_consent boolean not null,
          member_national_team boolean not null default false,
          wpc_medalist_date date null
        ) on commit drop;

        create temp table stg_competitions (
          unique_label text not null,
          name text not null,
          season smallint null,
          start_date date null,
          end_date date null,
          location text null,
          country text null,
          fai_rank text null,
          bulletin_status text null,
          finished_jump_rounds smallint null,
          bulletin_male int null,
          bulletin_female int null,
          bulletin_jm int null,
          bulletin_jf int null,
          wal_ar_organizer_points numeric null,
          competition_rang_code text null
        ) on commit drop;

        create temp table stg_results (
          unique_label text not null,
          competitor text not null,
          nation text null,
          gender text null,
          dob date null,
          fai_licence text null,
          start_number text null,
          team text null,
          member_national_team boolean null,
          wpc_medalist boolean null,
          military boolean null,
          j1 numeric null, j2 numeric null, j3 numeric null, j4 numeric null, j5 numeric null,
          j6 numeric null, j7 numeric null, j8 numeric null, sf numeric null, f numeric null,
          place_overall smallint null,
          place_m smallint null,
          place_f smallint null,
          place_j smallint null,
          place_mj smallint null,
          place_fj smallint null,
          place_master smallint null
        ) on commit drop;
        """
    )

    # --------------------
    # Stage Athletes
    # --------------------
    athletes_rows: list[list[str]] = []
    with p.athletes_csv.open("r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f, delimiter=";")
        for row in r:
            name = _clean_text(row.get("Competitor", ""))
            if not name:
                continue
            country = _clean_text(row.get("Nation", ""))
            gender = _as_gender(row.get("Gender", "M"))
            dob = _parse_date(row.get("DoB", ""))
            fai = _clean_text(row.get("FAI ID Licence", ""))
            if fai in {"", "0"}:
                fai = ""
            gdpr = _as_bool_yes(row.get("GDPR", ""))
            # Excel Athletes!L "2024 WPC" → member_national_team
            nt = _as_bool_yes(row.get("2024 WPC", ""))
            # Excel Athletes!V "WPC Medalist" → wpc_medalist_date
            # Sentinel value 2080-01-01 means "never won" → NULL
            wpc_date = _parse_date(row.get("WPC Medalist", ""))
            if wpc_date and wpc_date.startswith("2080"):
                wpc_date = None
            athletes_rows.append([
                name, country, gender, dob or "", fai or "",
                "true" if gdpr else "false",
                "true" if nt else "false",
                wpc_date or "",
            ])
    _copy_from_rows(
        cur,
        "stg_athletes",
        ["display_name", "country", "gender", "dob", "fai_licence", "gdpr_consent",
         "member_national_team", "wpc_medalist_date"],
        athletes_rows,
    )

    # Insert athletes (best-effort de-dupe on fai_licence when present; otherwise allow duplicates).
    cur.execute(
        """
        insert into public.athletes (
          display_name, country_code, gender, date_of_birth, fai_licence,
          gdpr_consent_given, gdpr_publish_full_name,
          member_national_team, wpc_medalist_date
        )
        select
          s.display_name,
          coalesce(
            case
              when upper(trim(coalesce(s.country, ''))) ~ '^[A-Z]{3}$'
              then upper(trim(s.country))
              else null
            end,
            (
              select c.sport3::text
              from public.country_sport_codes c
              where c.iso2 = public.normalize_country_to_iso2(nullif(trim(s.country), ''))::char(2)
            ),
            'XXX'
          ),
          s.gender,
          s.dob,
          nullif(s.fai_licence, ''),
          s.gdpr_consent,
          s.gdpr_consent,
          s.member_national_team,
          s.wpc_medalist_date
        from stg_athletes s
        where nullif(s.fai_licence, '') is null
           or not exists (select 1 from public.athletes a where a.fai_licence = nullif(s.fai_licence, ''));
        """
    )

    # --------------------
    # Stage Competitions
    # --------------------
    comp_rows: list[list[str]] = []
    with p.competitions_csv.open("r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f, delimiter=";")
        for row in r:
            unique_label = _clean_text(row.get("Unique Competition", ""))
            name = _clean_text(row.get("Competition", ""))
            if not unique_label or not name:
                continue
            season = _clean_text(row.get("Season", ""))
            start = _parse_date(row.get("Date of Competition start", ""))
            end = _parse_date(row.get("Date of Competition end", ""))
            place = _clean_text(row.get("Place", ""))
            country = _clean_text(row.get("Conutry", ""))
            fai_rank = _clean_text(row.get("FAI RANK", ""))
            bulletin_status = _clean_text(row.get("Bilten status", ""))
            finished = _clean_numeric(row.get("Finished jump rounds", ""))
            bm = _clean_numeric(row.get("M-Bilten", ""))
            bf = _clean_numeric(row.get("F-Bilten", ""))
            bjm = _clean_numeric(row.get("JM-Bilten", ""))
            bjf = _clean_numeric(row.get("JF-Bilten", ""))
            op = _clean_numeric(row.get("WALAR organizers points", ""))
            rang = _normalize_rang_code(row.get("Competition ranking", ""))
            comp_rows.append(
                [
                    unique_label,
                    name,
                    _clean_numeric(season),
                    start or "",
                    end or "",
                    place,
                    country,
                    fai_rank,
                    bulletin_status,
                    finished,
                    bm,
                    bf,
                    bjm,
                    bjf,
                    op,
                    rang or "",
                ]
            )
    _copy_from_rows(
        cur,
        "stg_competitions",
        [
            "unique_label",
            "name",
            "season",
            "start_date",
            "end_date",
            "location",
            "country",
            "fai_rank",
            "bulletin_status",
            "finished_jump_rounds",
            "bulletin_male",
            "bulletin_female",
            "bulletin_jm",
            "bulletin_jf",
            "wal_ar_organizer_points",
            "competition_rang_code",
        ],
        comp_rows,
    )

    cur.execute(
        """
        insert into public.competitions (
          unique_label, name, season, start_date, end_date, location, description,
          fai_event_rank, bulletin_status, finished_jump_rounds,
          bulletin_male, bulletin_female, bulletin_jm, bulletin_jf,
          wal_ar_organizer_points, competition_rang_code, status
        )
        select distinct on (s.unique_label)
          s.unique_label,
          s.name,
          s.season,
          coalesce(s.start_date, '1970-01-01'::date),
          coalesce(s.end_date, coalesce(s.start_date, '1970-01-01'::date)),
          coalesce(s.location, ''),
          null,
          nullif(s.fai_rank,''),
          nullif(s.bulletin_status,''),
          coalesce(s.finished_jump_rounds, 0),
          s.bulletin_male, s.bulletin_female, s.bulletin_jm, s.bulletin_jf,
          s.wal_ar_organizer_points,
          nullif(s.competition_rang_code,''),
          'results_published'::competition_status
        from stg_competitions s
        where not exists (select 1 from public.competitions c where c.unique_label = s.unique_label)
        order by s.unique_label, s.start_date desc nulls last
        returning id;
        """
    )
    new_comp_ids = [r[0] for r in cur.fetchall()]

    # --------------------
    # Stage Results (WALAR sheet)
    # --------------------
    res_rows: list[list[str]] = []
    with p.results_csv.open("r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f, delimiter=";")
        for row in r:
            unique_label = _clean_text(row.get("Uniqe Competition", ""))  # typo in workbook
            name = _clean_text(row.get("Competitor", ""))
            if not unique_label or not name:
                continue
            nation = _clean_text(row.get("Nation", ""))
            gender = _as_gender(row.get("Gender", "M"))
            dob = _parse_date(row.get("DoB", ""))
            fai = _clean_text(row.get("FAI ID Licence", ""))
            if fai.upper() == "#N/A" or fai in {"", "0"}:
                fai = ""
            start_no = _clean_text(row.get("Start number", ""))
            team = _clean_text(row.get("Team", ""))
            member_nt = _as_bool_yes(row.get("Member of National Team", ""))
            wpc_med = _as_bool_yes(row.get("WPC medalist", ""))
            mil = _as_bool_yes(row.get("Military", ""))

            def num(k: str, as_int: bool = False) -> str:
                v = _clean_text(row.get(k, ""))
                if not v or v in {"/", "-"}:
                    return ""
                if v.startswith("#"):
                    return ""
                m = re.match(r"^-?\d+(\.\d+)?", v)
                if not m:
                    return ""
                val = m.group(0)
                if as_int:
                    val = str(int(round(float(val))))
                    if val == "0":
                        return ""
                return val

            res_rows.append(
                [
                    unique_label,
                    name,
                    nation,
                    gender,
                    dob or "",
                    fai or "",
                    start_no,
                    team,
                    "true" if member_nt else "false",
                    "true" if wpc_med else "false",
                    "true" if mil else "false",
                    num("1. "),
                    num("2."),
                    num("3. "),
                    num("4."),
                    num("5. "),
                    num("6. "),
                    num("7."),
                    num("8. "),
                    num("SF"),
                    num("F"),
                    num("Place M+F", as_int=True),
                    num("Place M", as_int=True),
                    num("Place F", as_int=True),
                    num("Place J", as_int=True),
                    num("Place MJ", as_int=True),
                    num("Place FJ", as_int=True),
                    num("Place Master", as_int=True),
                ]
            )

    _copy_from_rows(
        cur,
        "stg_results",
        [
            "unique_label",
            "competitor",
            "nation",
            "gender",
            "dob",
            "fai_licence",
            "start_number",
            "team",
            "member_national_team",
            "wpc_medalist",
            "military",
            "j1",
            "j2",
            "j3",
            "j4",
            "j5",
            "j6",
            "j7",
            "j8",
            "sf",
            "f",
            "place_overall",
            "place_m",
            "place_f",
            "place_j",
            "place_mj",
            "place_fj",
            "place_master",
        ],
        res_rows,
    )

    # Map staging rows to athlete + competition and insert.
    # Prefer FAI licence match, else (name + nation + dob).
    cur.execute(
        """
        insert into public.competition_results (
          competition_id, athlete_id, start_number, team,
          jump1_cm, jump2_cm, jump3_cm, jump4_cm, jump5_cm, jump6_cm, jump7_cm, jump8_cm, sf_cm, f_cm,
          member_national_team, wpc_medalist,
          place_overall, place_m, place_f, place_j, place_mj, place_fj, place_master
        )
        select distinct on (c.id, a.id)
          c.id as competition_id,
          a.id as athlete_id,
          nullif(r.start_number,''),
          nullif(r.team,''),
          r.j1, r.j2, r.j3, r.j4, r.j5, r.j6, r.j7, r.j8, r.sf, r.f,
          coalesce(r.member_national_team, false),
          coalesce(r.wpc_medalist, false),
          r.place_overall, r.place_m, r.place_f, r.place_j, r.place_mj, r.place_fj, r.place_master
        from stg_results r
        join public.competitions c on c.unique_label = r.unique_label
        left join public.country_sport_codes cn
          on cn.iso2 = public.normalize_country_to_iso2(nullif(trim(r.nation::text), ''))::char(2)
        join public.athletes a on (
          (nullif(r.fai_licence,'') is not null and a.fai_licence = nullif(r.fai_licence,''))
          or (
            nullif(r.fai_licence,'') is null
            and a.display_name = r.competitor
            and coalesce(a.country_code,'') = coalesce(
              case
                when upper(trim(coalesce(r.nation::text, ''))) ~ '^[A-Z]{3}$'
                then upper(trim(r.nation::text))
                else null
              end,
              cn.sport3::text,
              'XXX'
            )
            and a.date_of_birth is not distinct from r.dob
          )
        )
        where not exists (
          select 1 from public.competition_results cr
          where cr.competition_id = c.id and cr.athlete_id = a.id
        )
        order by c.id, a.id, r.place_overall nulls last
        returning id, competition_id;
        """
    )

    recalc_rows = cur.fetchall()
    new_result_ids = [r[0] for r in recalc_rows]
    new_comp_ids = sorted(set(new_comp_ids) | {r[1] for r in recalc_rows})

    for rid in new_result_ids:
        cur.execute("select public.walar_recalculate_competition_result(%s);", (rid,))
    for cid in new_comp_ids:
        cur.execute("select public.walar_recalculate_competition_organizer_points(%s);", (cid,))

    # Commit.
    conn.commit()

    # Summary
    cur.execute("select count(*) from public.athletes;")
    athletes_n = cur.fetchone()[0]
    cur.execute("select count(*) from public.competitions;")
    comps_n = cur.fetchone()[0]
    cur.execute("select count(*) from public.competition_results;")
    results_n = cur.fetchone()[0]
    print(f"Imported athletes={athletes_n} competitions={comps_n} results={results_n}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

