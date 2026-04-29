from __future__ import annotations

import os

import psycopg2


def main() -> None:
    pw = os.environ.get("PGPASSWORD")
    if not pw:
        raise SystemExit("PGPASSWORD is not set")

    # Prefer Supabase connection pooler to avoid blocked port 5432 networks.
    host = os.environ.get("WALAR_PGHOST", "aws-1-eu-west-1.pooler.supabase.com")
    port = int(os.environ.get("WALAR_PGPORT", "6543"))
    dbname = os.environ.get("WALAR_PGDB", "postgres")
    user = os.environ.get("WALAR_PGUSER", "postgres.kfbnnlfxsehuswzezcpj")

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=pw,
        sslmode="require",
    )
    cur = conn.cursor()
    cur.execute("select 1 as ok;")
    print("ok", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()

