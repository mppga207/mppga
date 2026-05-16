-- Phase 1, Track 6: admin-editable landing-page content.
--
-- phase-1-buildout.md §9.7 left the storage destination open ("small
-- JSON column on a singleton table, or a dedicated rows-per-section
-- table"). Going with the singleton-JSON approach because:
--
-- 1. Landing copy is small (few KB) and edits are atomic — the admin
--    edits the whole page and clicks save once.
-- 2. Schema migrations don't have to follow shape changes — the
--    LandingContent TypeScript type is the source of truth for shape
--    and the loader merges the DB row over the in-code defaults.
-- 3. Rows-per-section would add complexity (which section keys exist,
--    ordering, partial updates) for no UX win.
--
-- The row stores a partial overlay — only fields the admin has
-- actually edited. Anything not set falls back to the defaults in
-- `lib/mppga/admin/landingContent.ts`. Reset writes `'{}'::jsonb`.
--
-- Singleton pattern mirrors `email_settings` and `site_settings`:
-- a CHECK-pinned id, RLS that allows public read + admin write.

create table public.site_content (
  id uuid primary key default '00000000-0000-0000-0000-000000000003'::uuid,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton
    check (id = '00000000-0000-0000-0000-000000000003'::uuid)
);

create trigger set_updated_at_site_content
  before update on public.site_content
  for each row execute function public.set_updated_at();

-- Seed the singleton row with empty overlay (defaults apply).
insert into public.site_content (id) values (default)
on conflict (id) do nothing;

alter table public.site_content enable row level security;

create policy site_content_public_select on public.site_content
  for select
  to anon, authenticated
  using (true);

create policy site_content_admin_update on public.site_content
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- INSERT and DELETE intentionally not permitted to any role — the
-- singleton is seeded above and lives forever.
