-- Optional ID document upload for profile edit access requests.
-- Stored in a private bucket; admins access via signed URLs.

-- Bucket
insert into storage.buckets (id, name, public)
values ('athlete-id-documents', 'athlete-id-documents', false)
on conflict (id) do update set public = false;

-- Request column
alter table public.athlete_profile_edit_requests
  add column if not exists id_document_path text;

