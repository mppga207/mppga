# MPPGA Admin Portal — Routes, Layout, Components

Read this before touching any route under `/admin`, any admin component,
or any admin server action.

-----

## 1. Scope & access

- **Audience:** the volunteer board. Identified by the `role` JWT custom
  claim (CLAUDE.md §2), backed by a `profiles.role` column
  (`member` | `admin`). The column drives the claim; the claim drives RLS.
- **Unauthenticated visitors:** redirected to `/sign-in`. No part of
  `/admin` is public.
- **Authenticated non-admins:** redirected to the member portal — never
  shown the admin shell, even briefly.
- **RLS:** admins can read `profiles`, `organizations`, `directory_listings`,
  `memberships`, `events`, `event_registrations`, and `tiers` across the
  table. All admin writes go through server actions; no client-side
  mutation of admin-scoped tables.

-----

## 2. Routing

| Path | Purpose |
|---|---|
| `/admin` | Members table (default landing) |
| `/admin/members/[id]` | Members table with the detail drawer open on that row |
| `/admin/events` | Events admin (full spec in `events.md`) |
| `/admin/settings` | Settings tabs (§6) |

Layout lives at `app/admin/layout.tsx`. Server component resolves the
session, asserts `role === "admin"`, and renders the admin shell. A
denied lookup redirects to the member portal — not a generic 403
(member-facing errors are instructional per `brand.md` §5).

-----

## 3. Layout

Wider than the public site — max width ~1280 px.

- **Top bar:** `MPPGA · Admin` mark + tab nav (Members · Events ·
  Settings) + right-side user menu (`<name> · sign out`).
- **Tab nav:** underline-on-active against `border-mppga-divider`. Each
  tab is its own route — no URL hash tabs.
- **Page padding:** `px-6 py-8`. Cards use the brand pattern from
  `brand.md` §4: `rounded-lg border border-mppga-divider bg-mppga-card`.
- **Mobile:** tab nav collapses to a `<select>`; the table becomes a
  stacked card list with the same kebab menu and a swipe-in drawer.

Admin tone is direct and data-dense per `brand.md` §5 — precision over
warmth.

-----

## 4. Members table (primary admin surface)

Default landing for `/admin`.

### Columns (in display order)

| Column | Source | Notes |
|---|---|---|
| Full name | `profiles.full_name` | Sortable; secondary sort default |
| Email | `auth.users.email` (via `profiles`) | Click to copy |
| Status | `memberships.status` | `<StatusBadge>` — full CLAUDE.md §4 enum |
| Tier | `tiers.name` via `memberships.tier_id` | Never hardcoded |
| Expires | `memberships.expires_at` | Default sort, ascending |
| Organization | `organizations.name` | Click → row detail drawer |
| City | `directory_listings.city` | Filterable |
| Last payment | Derived from Stripe (latest invoice) | Stretch — flag in UI if not yet wired |

Sort by `expires_at` ascending by default — soon-to-expire surfaces first.

### Filters (top of table)

- **Status:** multi-select chips. All six CLAUDE.md statuses:
  `Awaiting_Payment | Active | Grace_Period | Lapsed | Suspended |
  Honorary`. Default: none selected (show all).
- **Tier:** dropdown from the `tiers` table.
- **City:** dropdown from distinct `directory_listings.city`.
- **Specialty:** dropdown from `directory_listings.specialties`.
- **Reset filters** link clears all selections.

### Search

Single free-text input above the filters. Matches:

- `profiles.full_name`
- `auth.users.email`
- `organizations.name`

Debounce 250 ms. Submit as a URL query param so result sets are
shareable.

### Row actions (right-aligned kebab)

- **View detail** — opens the detail drawer (§5).
- **Override status** — admin override. Server action calls the
  `membership-status-sync` Edge Function with the requested status; the
  function performs the actual write. NEVER mutates `memberships.status`
  directly (CLAUDE.md constraint #2). Writes an `admin_action_log` row
  (§7).
- **Resend welcome email** — server action → Resend with the existing
  `welcome` template (`email-automation.md` §3.1). Logged in
  `email_send_log` AND `admin_action_log`.
- **Copy Stripe customer ID** — clipboard copy. Implemented in a small
  client component.

### Bulk actions

Row checkboxes select; bar slides in at the table top when any row is
selected.

- **Export CSV** — current filtered set; columns match the table view.
  Server action streams the file. Logged in `admin_action_log`.
- **Send announcement** — opens the email composer; routes through the
  `general-update` or `event-announcement` flows in
  `email-automation.md` §3.9 / §3.11.

-----

## 5. Member detail drawer

Slide-in panel triggered by a row click or "View detail".

- **Header:** full name, `<StatusBadge>`, email, member-since
  (`memberships.created_at`).
- **Tabs:**
  - **Profile** — read-only mirror of `profiles` plus inline edit for
    `full_name`. Email is read-only (sourced from auth).
  - **Organization** — linked `organizations` + `directory_listings`;
    edit visibility toggles and specialties.
  - **Billing** — last 5 Stripe invoices inline; "Open in Stripe" link
    out. Stripe customer ID is shown for support.
  - **Registrations** — rows from `event_registrations` with event
    title, date, `pricing_tier`, `payment_status`, waitlist position.
  - **Audit** — rows from `admin_action_log` scoped to this
    `subject_profile_id` (§7).

`compliance_logs` (CLAUDE.md §3) is append-only and surfaces ethics
signatures, NOT admin actions. Do not show ethics rows in the drawer's
Audit tab — they have their own view under Settings § 6.4.

-----

## 6. Settings tabs

Lives at `/admin/settings`. Sub-tabs (each is its own route):

- **6.1 Email timing** — edit `email_settings` values per
  `email-automation.md` §2.
- **6.2 Email templates** — edit subject + body per template key; syncs
  to Resend on save (`email-automation.md` §5).
- **6.3 Tier configuration** — pricing and benefit flags per row in the
  `tiers` table. Benefit-flag and name edits write directly. Dues
  edits go through the Stripe Price swap flow in
  `stripe-architecture.md` §6.5 — existing subscribers roll over at
  next renewal, no proration, with a confirmation prompt that names
  the affected member count. Event price changes do NOT
  retroactively affect existing `event_registrations` (snapshot per
  `events.md` §4).
- **6.4 Code of ethics** — current text, version history. View-only of
  `compliance_logs` signatures.
- **6.5 Contact & site info** — public contact email, social handles,
  external links.
- **6.6 Board roster** — manage which `profiles` have `role = 'admin'`.
- **6.7 Branding** — logo upload (per `brand.md` §3) and accent-color
  preview. Logo file lives in Supabase Storage.

-----

## 7. Admin action log

New table — add to the `data-model.md` migration alongside the others.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `actor_profile_id` | `uuid` | FK → `profiles.id`, the admin who acted |
| `subject_profile_id` | `uuid` | FK → `profiles.id`, the member affected (nullable for non-member actions) |
| `action` | `text` | Enum: `status_override`, `email_resend`, `profile_edit`, `csv_export`, `tier_change`, `template_edit`, `setting_change` |
| `payload` | `jsonb` | Action-specific details (old/new status, template key, exported row count, etc.) |
| `created_at` | `timestamptz` | Auto |

Append-only. Writes happen through server actions using the service
role; no client-side INSERT, no UPDATE, no DELETE. RLS: admins can
read; nobody can write directly.

Distinct from `compliance_logs` (ethics signatures) and `email_send_log`
(email dedup audit).

-----

## 8. Authentication

Sign-in lives at `/sign-in` (shared with the public site). Magic-link
flow via Supabase Auth is the working default for the prototype;
confirm with the client before launch. Admin sign-out clears the
session and redirects to `/`.

-----

## 9. Constraints

- NEVER render any admin route to a non-admin profile.
- NEVER write to `memberships.status` directly — always via the
  `membership-status-sync` Edge Function (CLAUDE.md constraint #2).
- NEVER hardcode tier names, IDs, or pricing — read from `tiers`
  (CLAUDE.md constraint #5).
- NEVER expose one member's data to another non-admin via any drawer
  or query — rely on RLS, never bypass it.
- NEVER UPDATE or DELETE rows in `admin_action_log` or
  `compliance_logs`.
- NEVER expose `auth.users.email` of one member to another non-admin.
- NEVER return a generic 403 to a non-admin — redirect to the member
  portal or to `/renew` when applicable (CLAUDE.md constraint #7).
- NEVER conflate `compliance_logs` (ethics signatures) with
  `admin_action_log` (admin actions) in the UI.
