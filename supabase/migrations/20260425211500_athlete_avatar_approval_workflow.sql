-- Avatar approval workflow:
-- - Linked users may submit a pending avatar
-- - Admin approves to publish it as the official avatar

alter table public.athletes
  add column if not exists pending_avatar_path text,
  add column if not exists pending_avatar_updated_at timestamptz,
  add column if not exists avatar_approved_at timestamptz,
  add column if not exists avatar_approved_by uuid;

comment on column public.athletes.pending_avatar_path is
  'Private Storage object path in athlete-avatars bucket awaiting admin approval.';

comment on column public.athletes.avatar_approved_by is
  'Auth user id of admin who approved the current avatar.';

create index if not exists athletes_pending_avatar_idx
  on public.athletes (pending_avatar_updated_at)
  where pending_avatar_path is not null;

