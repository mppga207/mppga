-- Phase 1, Track 1: schema foundation.
-- Extensions + every table from data-model.md §3, in FK-safe order.
-- Indexes, triggers, RLS policies, and seed rows live in the follow-up
-- migrations so they can be edited independently.

create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_contact_profile_id uuid,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tiers
-- ---------------------------------------------------------------------------
create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  stripe_product_id text unique,
  stripe_price_id text unique,
  annual_dues_cents integer not null default 0,
  voting_rights boolean not null default false,
  directory_listing boolean not null default false,
  corporate_umbrella boolean not null default false,
  display_order integer not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiers_dues_nonnegative check (annual_dues_cents >= 0)
);

-- ---------------------------------------------------------------------------
-- profiles
--   id = auth.users.id (same uuid, never independently generated).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  role text not null default 'member'
    constraint profiles_role_check check (role in ('member', 'admin')),
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Now that profiles exists, close the FK loop on organizations.
alter table public.organizations
  add constraint organizations_primary_contact_fkey
  foreign key (primary_contact_profile_id)
  references public.profiles (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- memberships
--   one row per profile. Status writes go through the
--   membership-status-sync Edge Function only.
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  tier_id uuid not null references public.tiers (id) on delete restrict,
  status text not null default 'Pending_Approval'
    constraint memberships_status_check check (
      status in (
        'Pending_Approval',
        'Awaiting_Payment',
        'Active',
        'Grace_Period',
        'Lapsed',
        'Suspended',
        'Honorary'
      )
    ),
  billing_status text
    constraint memberships_billing_status_check check (
      billing_status is null
      or billing_status in (
        'current',
        'past_due',
        'unpaid',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'trialing'
      )
    ),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  expires_at timestamptz,
  approved_at timestamptz,
  approved_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- directory_listings
-- ---------------------------------------------------------------------------
create table public.directory_listings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null default '',
  bio text,
  city text not null default '',
  state text not null default 'ME',
  address_line text,
  location geography(Point, 4326) not null,
  business_phone text,
  personal_mobile text,
  public_email text,
  specialties text[] not null default '{}',
  show_business_phone boolean not null default true,
  show_personal_mobile boolean not null default false,
  show_address boolean not null default false,
  show_public_email boolean not null default true,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- certifications
-- ---------------------------------------------------------------------------
create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  issuer text not null,
  issued_at date not null,
  expires_at date,
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz not null,
  end_date timestamptz,
  location text not null default '',
  member_price integer not null default 0,
  guest_price integer not null default 0,
  capacity integer not null,
  waitlist_enabled boolean not null default true,
  lapsed_member_pricing text not null default 'guest'
    constraint events_lapsed_pricing_check check (lapsed_member_pricing in ('member', 'guest')),
  status text not null default 'draft'
    constraint events_status_check check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_member_price_nonneg check (member_price >= 0),
  constraint events_guest_price_gte_member check (guest_price >= member_price),
  constraint events_capacity_positive check (capacity > 0),
  constraint events_end_after_start check (end_date is null or end_date >= date)
);

-- ---------------------------------------------------------------------------
-- ce_credits
-- ---------------------------------------------------------------------------
create table public.ce_credits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hours numeric(5, 2) not null,
  source text not null default '',
  event_id uuid references public.events (id) on delete set null,
  document_path text,
  status text not null default 'Pending'
    constraint ce_credits_status_check check (status in ('Pending', 'Approved')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_profile_id uuid references public.profiles (id) on delete set null,
  constraint ce_credits_hours_positive check (hours > 0)
);

-- ---------------------------------------------------------------------------
-- event_registrations
-- ---------------------------------------------------------------------------
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  price_paid integer not null default 0,
  pricing_tier text not null
    constraint event_registrations_pricing_tier_check check (pricing_tier in ('member', 'guest')),
  payment_status text not null default 'pending'
    constraint event_registrations_payment_status_check check (
      payment_status in ('pending', 'paid', 'refunded', 'free')
    ),
  stripe_checkout_session_id text unique,
  waitlist_position integer,
  status text not null default 'confirmed'
    constraint event_registrations_status_check check (status in ('confirmed', 'waitlisted', 'cancelled')),
  registered_at timestamptz not null default now(),
  constraint event_registrations_price_nonneg check (price_paid >= 0),
  constraint event_registrations_waitlist_position_positive check (
    waitlist_position is null or waitlist_position > 0
  )
);

-- ---------------------------------------------------------------------------
-- compliance_logs (APPEND-ONLY — see triggers migration)
-- ---------------------------------------------------------------------------
create table public.compliance_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete restrict,
  document_version text not null,
  document_hash text not null,
  signed_at timestamptz not null default now(),
  ip_address inet not null,
  user_agent text not null default ''
);

-- ---------------------------------------------------------------------------
-- email_settings (singleton)
-- ---------------------------------------------------------------------------
create table public.email_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  renewal_reminder_days_before integer[] not null default '{30,7,1}',
  event_reminder_hours_before integer[] not null default '{48,2}',
  waitlist_payment_link_expiry_hours integer not null default 24,
  dunning_retry_days integer[] not null default '{3,7,14}',
  updated_at timestamptz not null default now(),
  constraint email_settings_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid),
  constraint email_settings_expiry_positive check (waitlist_payment_link_expiry_hours > 0)
);

-- ---------------------------------------------------------------------------
-- email_send_log (APPEND-ONLY)
-- ---------------------------------------------------------------------------
create table public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  template text not null,
  trigger_type text not null
    constraint email_send_log_trigger_type_check check (trigger_type in ('automated', 'manual', 'webhook')),
  reference_id uuid,
  resend_message_id text,
  status text not null default 'sent'
    constraint email_send_log_status_check check (status in ('sent', 'failed', 'bounced')),
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- admin_action_log (APPEND-ONLY)
-- ---------------------------------------------------------------------------
create table public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles (id) on delete restrict,
  subject_profile_id uuid references public.profiles (id) on delete set null,
  action text not null
    constraint admin_action_log_action_check check (
      action in (
        'status_override',
        'email_resend',
        'profile_edit',
        'csv_export',
        'tier_change',
        'template_edit',
        'setting_change'
      )
    ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- donations (Phase 2 placeholder — RLS locks everything in policies migration)
-- ---------------------------------------------------------------------------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  amount_cents integer not null,
  recurring boolean not null default false,
  stripe_payment_intent_id text unique,
  message text,
  created_at timestamptz not null default now(),
  constraint donations_amount_positive check (amount_cents > 0)
);

-- ---------------------------------------------------------------------------
-- site_settings (singleton)
--   Single source of truth for the publicly displayed contact email and
--   phone number. Read by the public footer, contact page, and any email
--   footer that needs the association's contact line. Editable from the
--   admin Settings → Contact & site info tab (admin-portal.md §6.5).
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000002'::uuid,
  contact_email text not null default 'mppga207@gmail.com',
  contact_phone text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = '00000000-0000-0000-0000-000000000002'::uuid)
);
