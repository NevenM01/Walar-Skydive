## Athlete dedupe workflow (safe-only)

This project can accumulate duplicate rows in `public.athletes` due to CSV imports with varying name/country formatting.
Use this workflow to detect and merge duplicates safely without losing competition results.

### 1) Detect duplicates

Run the report:

- `scripts/ops_report_athlete_duplicates.sql`

This outputs duplicate groups of two types:

- `group_type = 'fai'`: same normalized FAI licence
- `group_type = 'name_country'`: same normalized name + `country_code`

### 2) Decide whether a group is safe to merge

Only merge automatically when:

- there is **at most one** distinct non-null `user_id` across the group, and
- there is **at most one** distinct non-null `date_of_birth` across the group.

If those checks fail, keep the group in a manual review queue.

### 3) Merge (manual / reviewed)

Use the SQL function:

```sql
select public.merge_athletes_safe(
  p_winner_id := '<winner-uuid>'::uuid,
  p_loser_ids := array['<loser-uuid-1>'::uuid, '<loser-uuid-2>'::uuid],
  p_reason := 'Manual merge after CSV import duplicate'
);
```

This will:

- retarget `competition_results` from losers to the winner
- fill missing winner profile fields from losers (only when winner is null/empty)
- delete loser athlete rows
- write an audit row to `public.athlete_merge_log`

### 4) Post-merge

Recalculate ranking if needed:

- Admin UI → Ranking → Recalculate all

### 5) Prevention

- Prefer resolving athletes by FAI licence during import.
- Reject CSV rows with unknown country codes (add missing aliases to `public.country_aliases`).
- Keep the partial unique index on normalized FAI licence to block duplicates when FAI is present.

