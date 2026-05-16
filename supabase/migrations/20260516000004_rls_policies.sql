-- Phase 1, Track 1: RLS policies per data-model.md §5.
-- RLS is enabled on every table. Service role bypasses RLS automatically
-- (Stripe webhook handler, status-sync function, scheduled jobs). Anything
-- a non-service-role caller can do has an explicit policy here.

-- Helper: admin check off the JWT custom claim.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', 'member') = 'admin'
$$;

-- ===========================================================================
-- organizations
-- ===========================================================================
alter table public.organizations enable row level security;

create policy organizations_select on public.organizations
  for select
  to authenticated
  using (
    public.is_admin()
    or id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy organizations_admin_write on public.organizations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- tiers — public read, admin write.
-- ===========================================================================
alter table public.tiers enable row level security;

create policy tiers_public_select on public.tiers
  for select
  to anon, authenticated
  using (true);

create policy tiers_admin_write on public.tiers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- profiles
--   Owner reads own row; admin reads all. Authenticated may UPDATE only
--   their own row; the column split (full_name/phone vs. role/organization_id)
--   is enforced in server actions, not RLS.
-- ===========================================================================
alter table public.profiles enable row level security;

create policy profiles_self_or_admin_select on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy profiles_self_update on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_update on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

-- INSERT is intentionally absent: only the create_profile_on_signup trigger
-- (running SECURITY DEFINER from auth.users) writes into this table.

-- ===========================================================================
-- memberships
--   Owner reads own row; admin reads all. Writes are service-role only —
--   CLAUDE.md constraint #2 (status writes go through the
--   membership-status-sync Edge Function).
-- ===========================================================================
alter table public.memberships enable row level security;

create policy memberships_self_or_admin_select on public.memberships
  for select
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

-- ===========================================================================
-- directory_listings
--   Anon sees only visible rows. Owner sees own regardless of visibility.
--   Admin sees all. Owner can INSERT/UPDATE own row; admin can write any.
-- ===========================================================================
alter table public.directory_listings enable row level security;

create policy directory_listings_anon_select on public.directory_listings
  for select
  to anon
  using (is_visible = true);

create policy directory_listings_auth_select on public.directory_listings
  for select
  to authenticated
  using (
    is_visible = true
    or auth.uid() = profile_id
    or public.is_admin()
  );

create policy directory_listings_self_insert on public.directory_listings
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy directory_listings_self_update on public.directory_listings
  for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy directory_listings_admin_all on public.directory_listings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- certifications
-- ===========================================================================
alter table public.certifications enable row level security;

create policy certifications_self_or_admin_select on public.certifications
  for select
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

create policy certifications_self_or_admin_insert on public.certifications
  for insert
  to authenticated
  with check (auth.uid() = profile_id or public.is_admin());

create policy certifications_self_or_admin_update on public.certifications
  for update
  to authenticated
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

create policy certifications_self_or_admin_delete on public.certifications
  for delete
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

-- ===========================================================================
-- ce_credits
--   Owner SELECT + INSERT (Pending only). Admin owns approval (UPDATE) and DELETE.
-- ===========================================================================
alter table public.ce_credits enable row level security;

create policy ce_credits_self_or_admin_select on public.ce_credits
  for select
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

create policy ce_credits_self_insert_pending on public.ce_credits
  for insert
  to authenticated
  with check (auth.uid() = profile_id and status = 'Pending');

create policy ce_credits_admin_update on public.ce_credits
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy ce_credits_admin_delete on public.ce_credits
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- compliance_logs
--   Owner reads own; admin reads all. Owner can INSERT. Trigger blocks
--   UPDATE/DELETE; no policy allows them either (defense in depth).
-- ===========================================================================
alter table public.compliance_logs enable row level security;

create policy compliance_logs_self_or_admin_select on public.compliance_logs
  for select
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

create policy compliance_logs_self_insert on public.compliance_logs
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- ===========================================================================
-- events
-- ===========================================================================
alter table public.events enable row level security;

create policy events_anon_select_published on public.events
  for select
  to anon
  using (status = 'published');

create policy events_auth_select on public.events
  for select
  to authenticated
  using (status = 'published' or public.is_admin());

create policy events_admin_all on public.events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- event_registrations
--   Owner reads own. Admin reads all. Writes are service-role only
--   (server actions resolve pricing per events.md §4 before writing).
-- ===========================================================================
alter table public.event_registrations enable row level security;

create policy event_registrations_self_or_admin_select on public.event_registrations
  for select
  to authenticated
  using (auth.uid() = profile_id or public.is_admin());

create policy event_registrations_admin_delete on public.event_registrations
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- email_settings — admin only.
-- ===========================================================================
alter table public.email_settings enable row level security;

create policy email_settings_admin_select on public.email_settings
  for select
  to authenticated
  using (public.is_admin());

create policy email_settings_admin_update on public.email_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- email_send_log — admin SELECT only; INSERT via service role; trigger blocks
-- UPDATE/DELETE.
-- ===========================================================================
alter table public.email_send_log enable row level security;

create policy email_send_log_admin_select on public.email_send_log
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- admin_action_log — admin SELECT only; INSERT via service role; trigger
-- blocks UPDATE/DELETE.
-- ===========================================================================
alter table public.admin_action_log enable row level security;

create policy admin_action_log_admin_select on public.admin_action_log
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- donations — Phase 2 placeholder. RLS enabled; no permissive policy.
-- Service role can still write when Phase 2 ships.
-- ===========================================================================
alter table public.donations enable row level security;

-- ===========================================================================
-- site_settings — public read of contact info, admin write.
-- ===========================================================================
alter table public.site_settings enable row level security;

create policy site_settings_public_select on public.site_settings
  for select
  to anon, authenticated
  using (true);

create policy site_settings_admin_update on public.site_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
