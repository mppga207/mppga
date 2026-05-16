-- Phase 1, Track 6: branding logo upload.
--
-- Adds a `logo_path` column to site_settings (the storage path within
-- the branding bucket — we derive the public URL at read time so the
-- column doesn't need to track API host changes).
--
-- Creates the public `branding` Supabase Storage bucket with policies:
--   - SELECT: public (logos are referenced from every public page)
--   - INSERT / UPDATE / DELETE: admin only via the role JWT claim
--
-- The site_settings.logo_path is updated by the server action that
-- handles the upload — Storage and the column are independent writes,
-- but the action does them both inside one server-action call.

alter table public.site_settings
  add column if not exists logo_path text;

-- ---------------------------------------------------------------------------
-- Storage bucket. Storage's bucket registry lives in the `storage` schema.
-- Creating it via SQL keeps the environment setup idempotent — `branding`
-- can be re-applied to fresh projects without manual dashboard steps.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage object policies for the bucket. Pattern mirrors what Supabase
-- generates from the dashboard for "public read, admin write":
-- ---------------------------------------------------------------------------
drop policy if exists branding_select on storage.objects;
create policy branding_select on storage.objects
  for select
  using (bucket_id = 'branding');

drop policy if exists branding_admin_insert on storage.objects;
create policy branding_admin_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_update on storage.objects
  for update
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_delete on storage.objects;
create policy branding_admin_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'branding' and public.is_admin());
