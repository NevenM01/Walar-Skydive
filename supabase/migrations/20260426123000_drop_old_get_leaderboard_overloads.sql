-- Prevent PostgREST "Could not choose the best candidate function" by removing
-- older get_leaderboard overloads. Keep the latest 6-parameter signature only.
--
-- Current desired signature:
--   public.get_leaderboard(text, uuid, int, text, date, date)

drop function if exists public.get_leaderboard(text, uuid, int);
drop function if exists public.get_leaderboard(text, uuid, int, text);

