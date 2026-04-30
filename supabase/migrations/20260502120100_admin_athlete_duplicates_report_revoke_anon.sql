-- Supabase grants EXECUTE on new functions to anon by default; duplicates report RPC is admin-only.
revoke all on function public.admin_athlete_duplicates_report() from anon;
