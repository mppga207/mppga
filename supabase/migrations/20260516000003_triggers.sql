-- Phase 1, Track 1: triggers per data-model.md §7 / §11.
-- updated_at maintenance, auth.users mirroring, profile bootstrap,
-- and append-only enforcement on the three audit tables.

-- ---------------------------------------------------------------------------
-- set_updated_at — bumps updated_at to now() on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at_organizations
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_updated_at_tiers
  before update on public.tiers
  for each row execute function public.set_updated_at();

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_memberships
  before update on public.memberships
  for each row execute function public.set_updated_at();

create trigger set_updated_at_directory_listings
  before update on public.directory_listings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_certifications
  before update on public.certifications
  for each row execute function public.set_updated_at();

create trigger set_updated_at_events
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger set_updated_at_email_settings
  before update on public.email_settings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_site_settings
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- create_profile_on_signup — AFTER INSERT on auth.users.
-- Runs as SECURITY DEFINER so the trigger can write into public.profiles
-- regardless of the inserting role's grants. Auth hook in migration 6
-- handles JWT claim defaults if this trigger races with the first sign-in.
-- ---------------------------------------------------------------------------
create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_profile_on_signup
  after insert on auth.users
  for each row execute function public.create_profile_on_signup();

-- ---------------------------------------------------------------------------
-- mirror_auth_email — keeps public.profiles.email in sync with auth.users.email.
-- ---------------------------------------------------------------------------
create or replace function public.mirror_auth_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id
     and email is distinct from new.email;
  return new;
end;
$$;

create trigger mirror_auth_email
  after update of email on auth.users
  for each row execute function public.mirror_auth_email();

-- ---------------------------------------------------------------------------
-- Append-only enforcement.
-- Triggers raise on any UPDATE or DELETE. RLS in the next migration revokes
-- the matching policies too — this is defense in depth, not redundant.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_compliance_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'compliance_logs is append-only: % forbidden', tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger prevent_compliance_logs_update
  before update on public.compliance_logs
  for each row execute function public.prevent_compliance_mutation();

create trigger prevent_compliance_logs_delete
  before delete on public.compliance_logs
  for each row execute function public.prevent_compliance_mutation();

create or replace function public.prevent_admin_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_action_log is append-only: % forbidden', tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger prevent_admin_action_log_update
  before update on public.admin_action_log
  for each row execute function public.prevent_admin_log_mutation();

create trigger prevent_admin_action_log_delete
  before delete on public.admin_action_log
  for each row execute function public.prevent_admin_log_mutation();

create or replace function public.prevent_send_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'email_send_log is append-only: % forbidden', tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger prevent_email_send_log_update
  before update on public.email_send_log
  for each row execute function public.prevent_send_log_mutation();

create trigger prevent_email_send_log_delete
  before delete on public.email_send_log
  for each row execute function public.prevent_send_log_mutation();
