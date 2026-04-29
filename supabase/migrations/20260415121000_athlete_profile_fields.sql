-- Athlete self-editable public profile fields (bio/social links)
-- Linked via public.athletes.user_id to auth.users.id

alter table public.athletes
  add column if not exists bio text,
  add column if not exists club text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

-- RLS: athlete may update only their own row (via user_id link).
-- athletes RLS is enabled in core schema; keep policy idempotent.
drop policy if exists "athletes_update_own" on public.athletes;
create policy "athletes_update_own"
  on public.athletes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

