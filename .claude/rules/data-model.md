# MPPGA Data Model — Tables, RLS, Migrations

Read this before creating, altering, or querying any table. The schema
described here is the single source of truth — never deviate from table
or field names without explicit instruction.

This file defines:

1. The full set of tables, their fields, and relationships
2. Row-level security policies per table
3. Enums, indexes, triggers, and constraints
4. Migration ordering
5. Deferred subsystems (voting, donations)

Companion specs:

- `@.claude/rules/auth-middleware.md` — how `role` and
  `membership_status` JWT claims gate routes and queries
- `@.claude/rules/stripe-architecture.md` — webhook handlers that
  write to `memberships`, `event_registrations`, etc.
- `@.claude/rules/directory-search.md` — PostGIS queries against
  `directory_listings`
- `@.claude/rules/admin-portal.md` — admin UI patterns
- `@.claude/rules/events.md` — `events` and `event_registrations` flow
- `@.claude/rules/email-automation.md` — `email_settings` and
  `email_send_log`

-----

## 1. Conventions

- **IDs:** every table has a `uuid` primary key with
  `default gen_random_uuid()`. Never use serial / bigserial.
- **Timestamps:** `created_at` and `updated_at` are `timestamptz`,
  default `now()`. An `update_updated_at` trigger maintains
  `updated_at` on UPDATE — see § 11.
- **Money:** stored as `integer` cents. Never `numeric`, never
  `float`. UI formats to dollars.
- **Enums:** stored as `text` with a `CHECK` constraint, not as
  Postgres `ENUM` types. This avoids painful ALTER TYPE migrations
  when adding new values.
- **Foreign keys:** always `ON DELETE` is spelled out per relationship
  below. Defaults to `RESTRICT` unless stated.
- **RLS:** enabled on every table. No exceptions — never disable RLS
  to simplify a query (CLAUDE.md constraint #1).
- **Nullability:** every field is `NOT NULL` unless explicitly marked
  nullable below.
- **Schema:** all tables live in the `public` schema unless noted.
- **Append-only tables** (`compliance_logs`, `email_send_log`,
  `admin_action_log`): RLS forbids UPDATE/DELETE for every role.
  A trigger backs this up at the database level (§ 11).

-----

## 2. Enums (text + CHECK)

| Name | Allowed values |
|---|---|
| `profile_role` | `member`, `admin` |
| `membership_status` | `Awaiting_Payment`, `Active`, `Grace_Period`, `Lapsed`, `Suspended`, `Honorary` |
| `billing_status` | `current`, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `trialing` (mirrors Stripe `subscription.status`) |
| `event_status` | `draft`, `published` |
| `event_pricing_tier` | `member`, `guest` |
| `event_lapsed_pricing` | `member`, `guest` |
| `event_payment_status` | `pending`, `paid`, `refunded`, `free` |
| `event_registration_status` | `confirmed`, `waitlisted`, `cancelled` |
| `ce_credit_status` | `Pending`, `Approved` |
| `admin_action` | `status_override`, `email_resend`, `profile_edit`, `csv_export`, `tier_change`, `template_edit`, `setting_change` |
| `email_send_status` | `sent`, `failed`, `bounced` |
| `email_trigger_type` | `automated`, `manual`, `webhook` |

`membership_status` values are canonical — adding or removing one
breaks the Edge Function and every consumer. Treat this enum as a
contract.

-----

## 3. Tables

### 3.1 `organizations`

Salon, clinic, or shop. The billing unit for the Corporate / Salon
tier. Sole proprietors don't need a row here — they exist as a
`profile` alone.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Required, unique-per-region in practice |
| `primary_contact_profile_id` | `uuid` | FK → `profiles.id` `ON DELETE SET NULL`. Nullable. |
| `stripe_customer_id` | `text` | Nullable. Set when the org subscribes. Unique. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

### 3.2 `profiles`

Extends `auth.users`. One profile per authenticated person.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK and FK → `auth.users.id` `ON DELETE CASCADE`. Same UUID as the auth user — never generated independently. |
| `full_name` | `text` |  |
| `email` | `text` | Mirrored from `auth.users.email` via trigger. Indexed. |
| `phone` | `text` | Nullable. |
| `role` | `profile_role` | Default `member`. Drives the JWT custom claim. |
| `organization_id` | `uuid` | Nullable. FK → `organizations.id` `ON DELETE SET NULL`. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

There is no direct `membership_id` field on `profiles`. The link is
`memberships.profile_id` — one-to-one in practice, enforced via a
unique index on `memberships.profile_id`. The current/effective
membership for a profile is the only row.

### 3.3 `tiers`

Tier configuration. Source of truth for pricing and benefit flags
(CLAUDE.md constraint #5).

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Unique. E.g. `Student / Apprentice`, `Professional`, `Corporate / Salon`. |
| `slug` | `text` | Unique, machine-safe (`student`, `professional`, `corporate`). For URL params and config lookup. |
| `stripe_product_id` | `text` | Stripe Product object. Created once per tier; persists across price changes. Nullable for `Honorary`. Unique when present. |
| `stripe_price_id` | `text` | Active Stripe Price object for recurring dues. Swapped on every dues edit per `stripe-architecture.md` §6.5. Nullable for `Honorary`. Unique when present. |
| `annual_dues_cents` | `integer` | Default 0. Honorary is 0. |
| `voting_rights` | `boolean` | `false` for Student / Apprentice per CLAUDE.md §5. |
| `directory_listing` | `boolean` | `false` for Student / Apprentice. |
| `corporate_umbrella` | `boolean` | `true` for Corporate / Salon. Allows sub-profiles via `organization_id`. |
| `display_order` | `integer` | UI sort order. |
| `description` | `text` | Member-facing tier description. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

Pricing values are TBD per CLAUDE.md §1 — never seed example dollar
amounts. The client confirms before any row is created.

### 3.4 `memberships`

Source of truth for portal access. Decoupled from Stripe's
`subscription.status` because grace and honorary states are MPPGA
business rules, not Stripe states.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE CASCADE`. Unique — one membership per profile. |
| `tier_id` | `uuid` | FK → `tiers.id` `ON DELETE RESTRICT`. |
| `status` | `membership_status` | Default `Awaiting_Payment`. Written only by the `membership-status-sync` Edge Function (CLAUDE.md constraint #2). |
| `billing_status` | `billing_status` | Nullable. Mirrors Stripe. Null for `Honorary`. |
| `stripe_customer_id` | `text` | Nullable. Unique. |
| `stripe_subscription_id` | `text` | Nullable. Unique. |
| `expires_at` | `timestamptz` | Nullable. Drives renewal reminders and grace transitions. Null for `Honorary`. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

Pricing snapshots: `memberships` does NOT store the dues amount. The
amount is read from `tiers.annual_dues_cents` at renewal time. Past
invoices are the historical record (via Stripe).

### 3.5 `directory_listings`

Public-facing geolocated directory entries. One per profile.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE CASCADE`. Unique. |
| `display_name` | `text` | What the public sees. Defaults to `profiles.full_name` or `organizations.name` if linked. |
| `bio` | `text` | Nullable. |
| `city` | `text` | Required. Indexed. |
| `state` | `text` | Default `'ME'`. |
| `address_line` | `text` | Nullable. Hidden by default. |
| `location` | `geography(Point, 4326)` | PostGIS point for radius search. Required. |
| `business_phone` | `text` | Nullable. |
| `personal_mobile` | `text` | Nullable. |
| `public_email` | `text` | Nullable. |
| `specialties` | `text[]` | Default `'{}'`. Indexed with GIN. |
| `show_business_phone` | `boolean` | Default `true`. |
| `show_personal_mobile` | `boolean` | Default `false` per CLAUDE.md constraint #9. |
| `show_address` | `boolean` | Default `false`. |
| `show_public_email` | `boolean` | Default `true`. |
| `is_visible` | `boolean` | Master switch. Default `true`. Auto-set to `false` when membership leaves `Active` / `Honorary`. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

Personal-mobile and address defaults are `false` (CLAUDE.md
constraint #9). Surface the flip in the dashboard, never default to
exposing them.

### 3.6 `certifications`

Credentials per profile. Documents live in Supabase Storage.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE CASCADE`. |
| `name` | `text` | E.g. "Certified Professional Groomer" |
| `issuer` | `text` | E.g. "NDGAA" |
| `issued_at` | `date` |  |
| `expires_at` | `date` | Nullable. |
| `document_path` | `text` | Nullable. Supabase Storage path. Served via signed URL only. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

### 3.7 `ce_credits`

CE hours logged by members, with admin approval workflow.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE CASCADE`. |
| `hours` | `numeric(5,2)` | E.g. `1.50` |
| `source` | `text` | Free text or event title. |
| `event_id` | `uuid` | Nullable. FK → `events.id` `ON DELETE SET NULL`. Set when the credit was earned at an MPPGA event. |
| `document_path` | `text` | Nullable. Supabase Storage path for certificate of completion. |
| `status` | `ce_credit_status` | Default `Pending`. |
| `submitted_at` | `timestamptz` | Auto. |
| `approved_at` | `timestamptz` | Nullable. |
| `approved_by_profile_id` | `uuid` | Nullable. FK → `profiles.id`. |

### 3.8 `compliance_logs`

Code-of-ethics signatures. APPEND-ONLY. UPDATE and DELETE forbidden
at the RLS and trigger level (CLAUDE.md constraint #4).

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE RESTRICT`. RESTRICT — never lose a signature when a profile is deleted; deletion must be blocked. |
| `document_version` | `text` | E.g. `v2.1` |
| `document_hash` | `text` | SHA-256 of the document text the user actually saw. |
| `signed_at` | `timestamptz` | Auto. |
| `ip_address` | `inet` | The IP the request came from. |
| `user_agent` | `text` | The browser UA string. |

### 3.9 `events`

Workshops, clinics, mixers, the annual meeting. Full ticketing spec
in `@.claude/rules/events.md`.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `title` | `text` | Required |
| `description` | `text` | Nullable. Shown on public event detail. |
| `date` | `timestamptz` | Event start. |
| `end_date` | `timestamptz` | Nullable. |
| `location` | `text` | Venue / city string. |
| `member_price` | `integer` | Cents. `0` = free for members. |
| `guest_price` | `integer` | Cents. Must be `>= member_price`. |
| `capacity` | `integer` | Hard cap. Required. |
| `waitlist_enabled` | `boolean` | Default `true`. |
| `lapsed_member_pricing` | `event_lapsed_pricing` | Default `guest`. |
| `status` | `event_status` | Default `draft`. |
| `created_by` | `uuid` | FK → `profiles.id` `ON DELETE SET NULL`. |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

### 3.10 `event_registrations`

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `event_id` | `uuid` | FK → `events.id` `ON DELETE CASCADE`. |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE CASCADE`. |
| `price_paid` | `integer` | Cents. Snapshot at registration time. |
| `pricing_tier` | `event_pricing_tier` | Snapshot. |
| `payment_status` | `event_payment_status` | Default `pending`. |
| `stripe_checkout_session_id` | `text` | Nullable. Null for free registrations. Unique when present. |
| `waitlist_position` | `integer` | Nullable. `NULL` when confirmed. Positive integer when waitlisted. |
| `status` | `event_registration_status` | Default `confirmed`. |
| `registered_at` | `timestamptz` | Auto |

Unique partial index: `(event_id, profile_id)` where `status != 'cancelled'`
— a member can only have one active registration per event.

### 3.11 `email_settings`

Singleton row. Admin-editable timing for every automated email
sequence. Full sequence spec in
`@.claude/rules/email-automation.md` § 2.

| Field | Type | Default |
|---|---|---|
| `id` | `uuid` | PK |
| `renewal_reminder_days_before` | `integer[]` | `'{30,7,1}'` |
| `event_reminder_hours_before` | `integer[]` | `'{48,2}'` |
| `waitlist_payment_link_expiry_hours` | `integer` | `24` |
| `dunning_retry_days` | `integer[]` | `'{3,7,14}'` |
| `updated_at` | `timestamptz` | Auto |

A `CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)`
constraint and a unique index enforce the singleton invariant.

### 3.12 `email_send_log`

Audit + dedup trail. APPEND-ONLY.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | Nullable for bulk sends. FK → `profiles.id` `ON DELETE SET NULL`. |
| `template` | `text` | Template key from `email-automation.md` § 5. |
| `trigger_type` | `email_trigger_type` |  |
| `reference_id` | `uuid` | Nullable. FK to the relevant business record (membership, event_registration, etc.) — application-enforced, no DB constraint because target varies. |
| `resend_message_id` | `text` | Nullable. Set on successful send. |
| `status` | `email_send_status` | Default `sent`. |
| `sent_at` | `timestamptz` | Auto |

Dedup index: `(profile_id, template, reference_id)` — automated
sends query this before firing.

### 3.13 `admin_action_log`

Admin audit trail. APPEND-ONLY (admin-portal.md § 7).

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `actor_profile_id` | `uuid` | FK → `profiles.id` `ON DELETE RESTRICT`. |
| `subject_profile_id` | `uuid` | Nullable. FK → `profiles.id` `ON DELETE SET NULL`. |
| `action` | `admin_action` |  |
| `payload` | `jsonb` | Action-specific details. Old/new status, template key, exported row count, etc. |
| `created_at` | `timestamptz` | Auto |

### 3.14 `donations` — Phase 2 placeholder

Schema lives but no UI or write path until Phase 2 (CLAUDE.md
Open Architecture). Do not query, expose, or write to this table
without explicit instruction.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | Nullable for anonymous gifts. FK → `profiles.id` `ON DELETE SET NULL`. |
| `amount_cents` | `integer` |  |
| `recurring` | `boolean` | Default `false`. |
| `stripe_payment_intent_id` | `text` | Nullable. Unique when present. |
| `message` | `text` | Nullable. |
| `created_at` | `timestamptz` | Auto |

### 3.15 `site_settings`

Singleton row. Single source of truth for the publicly displayed
contact email and phone number for the association. Read by the
public footer, Contact page, dashboard support links, and every
email footer. Editable from the admin Settings → Contact & site
info tab (`admin-portal.md` §6.5) — changing the email or phone
here propagates everywhere automatically, with no other code
edits required.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK. Pinned to `00000000-0000-0000-0000-000000000002` via CHECK. |
| `contact_email` | `text` | Required. Seeded with `mppga207@gmail.com`. |
| `contact_phone` | `text` | Nullable. |
| `updated_at` | `timestamptz` | Auto |

A `CHECK (id = '00000000-0000-0000-0000-000000000002'::uuid)`
constraint and the implicit PK uniqueness enforce the singleton
invariant.

-----

## 4. Deferred subsystems

### 4.1 Voting — shelved as a potential Phase 2+ add-on

The election tables remain documented because the schema must
support voter anonymity if voting ever ships. Do NOT migrate, query,
or build UI for these tables until voting is explicitly back in
scope. When that happens, a `@.claude/rules/voting.md` file must be
written before any work begins.

#### `elections`

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `title` | `text` |  |
| `description` | `text` | Nullable |
| `opens_at` | `timestamptz` |  |
| `closes_at` | `timestamptz` |  |
| `quorum_threshold` | `integer` | Minimum participants for the result to count. |
| `candidates` | `jsonb` | Ballot structure. |
| `status` | `text` | `draft`, `open`, `closed`, `published`. |
| `created_at` | `timestamptz` | Auto |

#### `election_participants`

Records WHO voted. Quorum / dedup only.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `election_id` | `uuid` | FK → `elections.id` `ON DELETE RESTRICT`. |
| `profile_id` | `uuid` | FK → `profiles.id` `ON DELETE RESTRICT`. |
| `voted_at` | `timestamptz` | Coarse — bucketed to the hour to prevent timing correlation with `election_ballots`. |

Unique `(election_id, profile_id)` — one participation per member.

#### `election_ballots`

Records THE VOTE. NO `profile_id` FK. NO column that can correlate to
a participant row (CLAUDE.md constraint #3).

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `election_id` | `uuid` | FK → `elections.id` `ON DELETE RESTRICT`. |
| `ballot_data` | `jsonb` | The vote. |
| `submitted_at` | `timestamptz` | Coarse — bucketed to the hour. |

The legal requirement is that `election_participants` and
`election_ballots` cannot be joined to identify how a specific
member voted. Adding a `user_id`, a precise timestamp, or any
correlating column to `election_ballots` is forbidden.

### 4.2 LMS-integrated CE delivery — out of scope this phase

`@CLAUDE.md` § 7 Open Architecture. `ce_credits` currently covers
manual logging. LMS sync, if it ships, will add an `lms_record_id`
column and a sync table; do not pre-build either.

### 4.3 Member-facing CE and ethics UI — deferred to a future version

Per `@CLAUDE.md` § 1, the member dashboard tabs for CE tracking and
the Code of ethics are hidden. The page files at
`app/(portal)/dashboard/ce` and `app/(portal)/dashboard/ethics`
remain in the codebase, and the `ce_credits` and `compliance_logs`
tables stay on the schema with their RLS policies intact — saved
for when these features are unshelved. Do NOT re-add the tabs to
`lib/mppga/portal/tabs.ts` or surface CE / ethics chrome in the
member portal without explicit instruction.

The admin-side CE approval workflow (`ce_credits.status` flips from
`Pending` → `Approved` by an admin) is part of the same deferral.

-----

## 5. RLS policies

RLS is enabled on every table. Policies below describe the only
permitted read/write paths.

The `admin` role is identified by the `role` JWT custom claim (set by
a Supabase auth hook from `profiles.role`). The expression
`auth.jwt() ->> 'role' = 'admin'` is the canonical admin check.

### 5.1 `organizations`

- SELECT: admin OR a profile whose `organization_id` matches the row.
- INSERT / UPDATE / DELETE: admin only.

### 5.2 `profiles`

- SELECT: a profile can read its own row. Admin reads all.
- UPDATE: a profile can update its own `full_name`, `phone`. `role`
  and `organization_id` are admin-only. Server actions using the
  service role enforce the column split — RLS forbids writes from
  authenticated.
- INSERT: handled by an auth hook trigger on `auth.users` creation;
  no client INSERT permitted.
- DELETE: admin only.

### 5.3 `tiers`

- SELECT: public (anon + authenticated + admin). Tier names and
  pricing are public information.
- INSERT / UPDATE / DELETE: admin only.

### 5.4 `memberships`

- SELECT: a profile can read its own membership. Admin reads all.
- INSERT / UPDATE / DELETE: service role only. Never authenticated.
  This is the hard boundary that backs CLAUDE.md constraint #2 —
  status writes go through the `membership-status-sync` Edge
  Function.

### 5.5 `directory_listings`

- SELECT: anon reads any row where `is_visible = true`. Owner reads
  their own row regardless. Admin reads all.
- INSERT / UPDATE: a profile can write its own row. Admin can write
  any row. Server actions enforce that `is_visible` flips off when
  membership status leaves `Active` / `Honorary` — RLS alone cannot
  cross-reference `memberships`.
- DELETE: admin only.

Personal-contact column visibility is enforced in the query layer
(server-side projection) and in the RLS SELECT policy via a view
that masks columns when `show_* = false`. See
`@.claude/rules/directory-search.md`.

### 5.6 `certifications`

- SELECT: owner. Admin reads all.
- INSERT / UPDATE / DELETE: owner OR admin.

### 5.7 `ce_credits`

- SELECT: owner. Admin reads all.
- INSERT: owner inserts with `status = 'Pending'`. The CHECK on
  insert restricts the status value.
- UPDATE: admin only (approval workflow).
- DELETE: admin only.

### 5.8 `compliance_logs`

- SELECT: owner. Admin reads all.
- INSERT: owner only. Server action sets `ip_address`,
  `user_agent`, `document_hash` server-side.
- UPDATE / DELETE: forbidden for all roles. Enforced at RLS AND by
  a row-level trigger (§ 11).

### 5.9 `events`

- SELECT: anon reads rows where `status = 'published'`. Admin reads all.
- INSERT / UPDATE / DELETE: admin only.

### 5.10 `event_registrations`

- SELECT: owner reads their own rows. Admin reads all.
- INSERT / UPDATE: service role only (server actions resolve pricing
  per `events.md` § 4 before writing).
- DELETE: admin only (cancellations go via UPDATE
  `status = 'cancelled'`, not DELETE).

### 5.11 `email_settings`

- SELECT: admin only.
- UPDATE: admin only.
- INSERT / DELETE: forbidden — singleton row is seeded in migration.

### 5.12 `email_send_log`

- SELECT: admin only. (Owners do not need to see the dedup log.)
- INSERT: service role only.
- UPDATE / DELETE: forbidden for all roles. Trigger enforces.

### 5.13 `admin_action_log`

- SELECT: admin only.
- INSERT: service role only.
- UPDATE / DELETE: forbidden for all roles. Trigger enforces.

### 5.14 `donations` — Phase 2 placeholder

- SELECT / INSERT / UPDATE / DELETE: forbidden for all roles until
  Phase 2 ships. The table exists; no policy allows access.

### 5.15 Voting tables — deferred

RLS enabled, no permissive policies. Effectively read/write
forbidden for every role until voting ships and `voting.md` is
authored. Bypassing the table from a Postgres function is a
constraint violation.

### 5.16 `site_settings`

- SELECT: public (anon + authenticated + admin). The contact email
  and phone are public-facing by definition.
- UPDATE: admin only.
- INSERT / DELETE: forbidden — singleton row is seeded in migration.

-----

## 6. Indexes

In addition to PK / FK / unique indexes implied above:

| Table | Index | Purpose |
|---|---|---|
| `profiles` | `(email)` | Auth + admin search |
| `profiles` | `(organization_id)` | Org → member lookup |
| `memberships` | `(profile_id)` UNIQUE | One-to-one with profile |
| `memberships` | `(status)` | Admin filter |
| `memberships` | `(expires_at)` | Renewal-reminder scheduled job |
| `memberships` | `(stripe_customer_id)` | Stripe webhook handler lookup |
| `memberships` | `(stripe_subscription_id)` | Stripe webhook handler lookup |
| `directory_listings` | GIST on `location` | PostGIS radius search |
| `directory_listings` | `(city)` | Filter |
| `directory_listings` | GIN on `specialties` | Filter |
| `directory_listings` | `(profile_id)` UNIQUE | One per profile |
| `events` | `(status, date)` | Public list query |
| `event_registrations` | `(event_id, status)` | Capacity / waitlist count |
| `event_registrations` | `(profile_id)` | My-events lookup |
| `event_registrations` | partial `(event_id, profile_id)` WHERE `status != 'cancelled'` UNIQUE | One active reg per member per event |
| `email_send_log` | `(profile_id, template, reference_id)` | Dedup check |
| `compliance_logs` | `(profile_id, signed_at DESC)` | Latest signature lookup |
| `ce_credits` | `(profile_id, status)` | "My CE" view |
| `admin_action_log` | `(subject_profile_id, created_at DESC)` | Member-detail audit tab |

-----

## 7. Triggers

| Trigger | Tables | Behavior |
|---|---|---|
| `set_updated_at` | every table with `updated_at` | BEFORE UPDATE — sets `updated_at = now()`. |
| `mirror_auth_email` | `profiles` | AFTER INSERT or UPDATE on `auth.users` — keeps `profiles.email` in sync with `auth.users.email`. |
| `create_profile_on_signup` | `auth.users` | AFTER INSERT — creates a `profiles` row with `role = 'member'`. |
| `prevent_compliance_mutation` | `compliance_logs` | BEFORE UPDATE OR DELETE — `RAISE EXCEPTION`. Append-only enforcement. |
| `prevent_admin_log_mutation` | `admin_action_log` | BEFORE UPDATE OR DELETE — `RAISE EXCEPTION`. |
| `prevent_send_log_mutation` | `email_send_log` | BEFORE UPDATE OR DELETE — `RAISE EXCEPTION`. |
| `prevent_ballot_correlation` | `election_ballots` | BEFORE INSERT — verifies `submitted_at` is bucketed (truncated to hour). Deferred until voting ships. |

-----

## 8. Extensions

```sql
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "postgis";    -- geography type, GIST
create extension if not exists "citext";     -- case-insensitive email (optional)
```

PostGIS is required (CLAUDE.md § 2). Never substitute lat/lng pairs
for the `geography(Point, 4326)` column.

-----

## 9. Migration order

Migrations live in `supabase/migrations/` with `YYYYMMDDHHMMSS_*`
filenames. The first migration in the project creates the tables in
this order to satisfy FK constraints:

1. extensions (`pgcrypto`, `postgis`)
2. enums (CHECK-constrained text — created as part of table DDL,
   not separately)
3. `organizations` (no FKs)
4. `tiers` (no FKs)
5. `profiles` (FK → `auth.users`, `organizations`)
6. `memberships` (FK → `profiles`, `tiers`)
7. `directory_listings` (FK → `profiles`)
8. `certifications` (FK → `profiles`)
9. `events` (FK → `profiles`)
10. `ce_credits` (FK → `profiles`, `events`)
11. `event_registrations` (FK → `events`, `profiles`)
12. `compliance_logs` (FK → `profiles`)
13. `email_settings` (singleton, seed row)
14. `email_send_log` (FK → `profiles`)
15. `admin_action_log` (FK → `profiles`)
16. `donations` (FK → `profiles`) — created, no RLS allow
17. Deferred voting tables — NOT created in initial migration.
    Added only when voting is unshelved.

RLS policies and triggers are created in a follow-up migration so
they can be edited independently of table DDL.

-----

## 10. Seeding

The initial migration seeds:

- The singleton row in `email_settings` with the defaults from § 3.11.
- Three rows in `tiers` (Student / Apprentice, Professional,
  Corporate / Salon) with `annual_dues_cents = 0`,
  `stripe_product_id = NULL`, and `stripe_price_id = NULL`. The
  client confirms pricing before these are updated; the first
  dues edit in the admin portal creates the Stripe Product and
  Price together (see `stripe-architecture.md` §6.5 edge cases).

Nothing else is seeded. No example members, no example events. The
admin UI seeds reality.

-----

## 11. Constraints — MUST ADHERE

These reinforce CLAUDE.md § 10. Repeated here because data-layer
changes are the highest-leverage way to violate them.

1. NEVER disable RLS on any table.
2. NEVER allow client-side INSERT/UPDATE to `memberships`. Service
   role only, via the `membership-status-sync` Edge Function or
   webhook handler.
3. NEVER add a `profile_id` or `user_id` FK to `election_ballots`.
   Never add a precise timestamp. Voter anonymity is legally
   required.
4. NEVER UPDATE or DELETE rows in `compliance_logs`,
   `admin_action_log`, or `email_send_log`. Triggers enforce; do
   not work around them.
5. NEVER store dues prices, tier IDs, or benefit flags in
   application code. Always read from `tiers`.
6. NEVER store mobile / address values on `directory_listings` with
   `show_*` defaulted to `true`. Defaults are `false` per CLAUDE.md
   constraint #9.
7. NEVER use a Postgres `ENUM` type — text + CHECK only.
8. NEVER substitute lat/lng pairs for the PostGIS `geography` column.
9. NEVER seed example records into a migration. Real data only.
10. NEVER skip the deferred voting tables' RLS lockdown. "Deferred"
    means "exists but is closed to every role", not "ignore".
