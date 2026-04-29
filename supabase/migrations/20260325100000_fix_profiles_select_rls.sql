-- Fix: old policy used EXISTS (SELECT ... FROM profiles ...) which re-applies RLS on profiles
-- and prevents users from reading their own row (profile always null in the app).

drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create or replace function public.jwt_is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.jwt_is_app_admin() from public;
grant execute on function public.jwt_is_app_admin() to authenticated;
grant execute on function public.jwt_is_app_admin() to service_role;

create policy "profiles_select_own_row"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_select_all_if_admin"
  on public.profiles
  for select
  to authenticated
  using (public.jwt_is_app_admin());
