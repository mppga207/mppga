-- Phase 1, Track 1: indexes per data-model.md §6.
-- Primary-key, unique, and FK indexes already exist from the table DDL.
-- Everything below is performance scaffolding for the queries we know
-- we'll run.

-- profiles
create index profiles_email_idx on public.profiles (email);
create index profiles_organization_id_idx on public.profiles (organization_id);

-- memberships
create index memberships_status_idx on public.memberships (status);
create index memberships_expires_at_idx on public.memberships (expires_at);

-- directory_listings
create index directory_listings_location_gist on public.directory_listings using gist (location);
create index directory_listings_city_idx on public.directory_listings (city);
create index directory_listings_specialties_gin on public.directory_listings using gin (specialties);

-- events
create index events_status_date_idx on public.events (status, date);

-- event_registrations
create index event_registrations_event_status_idx on public.event_registrations (event_id, status);
create index event_registrations_profile_idx on public.event_registrations (profile_id);
create unique index event_registrations_active_unique
  on public.event_registrations (event_id, profile_id)
  where status <> 'cancelled';

-- email_send_log dedup
create index email_send_log_dedup_idx
  on public.email_send_log (profile_id, template, reference_id);

-- compliance_logs latest-signature lookup
create index compliance_logs_profile_signed_idx
  on public.compliance_logs (profile_id, signed_at desc);

-- ce_credits
create index ce_credits_profile_status_idx on public.ce_credits (profile_id, status);

-- admin_action_log
create index admin_action_log_subject_idx
  on public.admin_action_log (subject_profile_id, created_at desc);
