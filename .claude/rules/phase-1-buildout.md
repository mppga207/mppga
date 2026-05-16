# MPPGA Phase 1 Buildout — Tracks, Dependencies, Blocking Decisions

Read this when picking up the data-wiring milestone — the phase that
turns the static shells into a real application backed by Supabase,
Stripe, and Resend.

This file is the SEQUENCED PUNCH LIST. It does not re-describe
architecture — every track points back at the `.claude/rules/*.md`
file that owns the *how*.

-----

## 1. Purpose

The shell audit (closed May 2026) brought every page to layout-complete
state with no dead links. Persistence and identity are still off.

The application currently:

- Has no migrations (every table in `data-model.md` §3 is unbuilt).
- Has no Supabase Auth wiring beyond a session-refresh stub.
- Returns 501 from the Stripe webhook handler.
- Returns 501 from the `membership-status-sync` Edge Function.
- Ships no Resend integration code.
- Renders every member-facing surface from mock fixtures.

This doc sequences the work to flip those off. Eight tracks, with
dependencies called out. Track each one to completion before opening
the next where the chain demands it.

-----

## 2. Track summary

| # | Track | Blocks | Owned-by spec |
|---|---|---|---|
| 1 | Foundation — schema, RLS, types, session helpers, real middleware | everything | `data-model.md`, `auth-middleware.md` |
| 2 | Member lifecycle — status sync function, magic-link signup, auto-accept on payment | 3, 5, 6, 7 | `auth-middleware.md`, `data-model.md` §4 |
| 3 | Stripe billing — webhook, Customer Portal, subscription Checkout, dunning | 5 (billing tab), 6 (members admin), 7 | `stripe-architecture.md` |
| 4 | Resend email layer — send helper, dedup log, templates, scheduled cron | 6 (admin emails) | `email-automation.md` |
| 5 | Member portal data wiring — profile, directory, events, billing tab | — | `admin-portal.md` §5, `directory-search.md` §5 |
| 6 | Admin portal data wiring — members table, event CRUD, settings, content, emails | — | `admin-portal.md` |
| 7 | Event ticketing — registration server action, Checkout, waitlist promotion | — | `events.md` |
| 8 | Public directory (Phase 2 by default — pull forward only on instruction) | — | `directory-search.md` |

Tracks 5, 6, 7 are largely parallelizable once 1 + their listed
prerequisites are done. Tracks 1, 2, 3, 4 should be done in that order
because each one is consumed by the next.

-----

## 3. Blocking decisions

None of these can be deferred past the start of the affected track.
Resolve them before opening that track's first PR.

| # | Question | Affects | Source | Status |
|---|---|---|---|---|
| 1 | **Geocoder provider** — Mapbox / Google / Nominatim | Track 5 (directory edit), Track 8 | `directory-search.md` §4.1 | Deferred to Track 5 (client, 2026-05-16) |
| 2 | **Tier pricing** — annual_dues_cents for Student, Professional, Corporate | Track 3 (subscription Checkout), Track 1 (seed migration) | `CLAUDE.md` §1 | Resolved 2026-05-16: $25 / $75 / $200 (seeded as 2500 / 7500 / 20000 cents) |
| 3 | **Production domain** | Track 3 (Stripe live keys), Track 4 (Resend domain verification) | `CLAUDE.md` §1 | Open |
| 4 | **Renewal-receipt template** — new key vs. reuse `welcome` | Track 4 | `stripe-architecture.md` §6.2 | Open |
| 5 | **`/directory`** — Phase 1 acceleration or Phase 2 as planned | Track 8 timing | `CLAUDE.md` §1 | Open |
| 6 | **Stripe invoice number prefix** — per environment | Track 3 | `stripe-architecture.md` §5.2 | Open |
| 7 | **Email "from" address** for Resend | Track 4 | `email-automation.md` §6 | Resolved 2026-05-16: `mppga207@gmail.com`. Also the seed value for `site_settings.contact_email`; Track 6 wires admin editing so a single change propagates everywhere. |

A decision shipped as a one-line note in this file is enough to unblock
work; don't wait for a full doc update.

-----

## 4. Track 1 — Foundation

The whole application sits on this. Nothing else compiles to truth
without it.

### Tasks

1. **Migration: extensions + enums.** `pgcrypto`, `postgis`, `citext`
   per `data-model.md` §8. Text-with-CHECK enums per §2.
2. **Migration: tables.** Sixteen tables in the order listed in
   `data-model.md` §9.
3. **Migration: indexes.** All entries from `data-model.md` §6
   including the GIST on `directory_listings.location` and the partial
   unique on `event_registrations`.
4. **Migration: triggers.** `set_updated_at`, `mirror_auth_email`,
   `create_profile_on_signup`, the three append-only mutation
   blockers (`compliance_logs`, `admin_action_log`, `email_send_log`).
   Per `data-model.md` §7 and §11.
5. **Migration: RLS policies.** Every policy in `data-model.md` §5.
6. **Migration: seed rows.** `email_settings` singleton + three rows
   in `tiers` with `annual_dues_cents = 0` and `stripe_price_id =
   NULL` per `data-model.md` §10. Tier pricing updates happen later
   once decision #2 lands.
7. **Auth hook function.** `public.handle_auth_jwt_claims` per
   `auth-middleware.md` §2.1. Bind it in the Supabase dashboard for
   each environment.
8. **Regenerate `types/database.ts`** via
   `pnpm supabase gen types typescript`.
9. **`lib/supabase/session.ts`** — `getSession()`, `requireSession()`,
   `requireAdmin()`, `requireMember()` per `auth-middleware.md` §4.3.
10. **Real `updateSession`** in `lib/supabase/middleware.ts` — the
    route protection matrix from `auth-middleware.md` §3, reading
    claims from `app_metadata` only.

### Done-when

- A fresh `supabase db reset` produces every table.
- `pnpm typecheck` is green with the generated types.
- Logged-in user in a server component can read their own profile via
  the user-scoped client; RLS blocks reading another profile.
- Hitting `/dashboard` while signed out redirects to `/sign-in` (not
  403, not a blank page).

-----

## 5. Track 2 — Member lifecycle

Status is the source of truth for portal access. This track makes the
state machine real.

### Prerequisites

Track 1.

### Tasks

1. **`membership-status-sync` Edge Function** — implements the state
   machine in `CLAUDE.md` §4. Owns every write to
   `memberships.status`. Reads expirations, applies Grace_Period
   (30-day window), Lapsed transitions, admin overrides. Calls
   `auth.admin.signOut(scope: 'others')` after status writes
   (`auth-middleware.md` §2.2).
2. **`/join` application server action.** Magic-link signup via
   `signInWithOtp`. The tier slug travels in `options.data` so the
   auth-callback route can create the `memberships` row in
   `Awaiting_Payment` via the service-role client
   (`auth-middleware.md` §6.1).
3. **Auth callback route** at `/auth/callback/route.ts` — exchanges
   the code, writes cookies, materializes the membership row on
   first sign-in, and redirects to `next` (default `/dashboard`,
   which middleware then routes to `/dashboard/checkout` for new
   members).
4. **`/dashboard/checkout`** page — destination for
   Awaiting_Payment per `auth-middleware.md` §3.1. Hosts the
   Stripe Checkout link (stub until Track 3 wires the real session
   creator).

### Done-when

- A new email completes the join form, gets a magic link, lands on
  `/dashboard/checkout`, and sees the "Complete your dues" CTA.
- The first successful `invoice.paid` webhook from Track 3 flips
  the member to `Active` and the next request lands on
  `/dashboard`.

### Status (2026-05-16)

Shipped:

- Schema migration `20260516000007_remove_board_approval.sql` drops
  `Pending_Approval` from the status enum, defaults the column to
  `Awaiting_Payment`, removes the `approved_at` /
  `approved_by_profile_id` columns, and updates the JWT-claims
  hook's default.
- `supabase/functions/membership-status-sync/index.ts` is the real
  state machine. Single-member and `{ sweep: true }` modes.
  Service-role-gated via the Authorization header. Calls
  `auth.admin.signOut(user_id, 'others')` after every write.
- `/join` form is wired through `joinMembership` server action;
  `/sign-in` is rewritten as a magic-link form via
  `signInWithMagicLink`. Both stash tier slug / full name in
  `options.data` and route through `/auth/callback`.
- `/auth/callback/route.ts` exchanges the code, idempotently
  inserts the `memberships` row in `Awaiting_Payment` via
  `createPendingMembership`, and redirects to `next`.
- `/dashboard/checkout` page reads the member's tier + dues and
  shows a stub Stripe CTA.
- `lib/email/send.ts` writes `email_send_log` rows with the dedup
  key and console-logs the would-be payload; Track 4 swaps the
  console.log for the real Resend call.

Outstanding (waiting on other tracks):

- Real Stripe Checkout link on `/dashboard/checkout` — Track 3.
- Welcome email fired by webhook on first `invoice.paid` —
  Track 3 + Track 4.
- Daily cron that POSTs `{ sweep: true }` to the Edge Function —
  Track 3 (alongside dunning cron).
- Bind the `handle_auth_jwt_claims` hook in each Supabase
  environment (Dashboard → Auth → Hooks → Custom Access Token).
  Deploy `supabase functions deploy membership-status-sync` per
  environment.

-----

## 6. Track 3 — Stripe billing

Subscriptions. One-off ticket Checkouts belong to Track 7.

### Prerequisites

Track 1 (the `memberships` table and tier rows exist), Track 2
(status sync function is callable), blocking decisions #2, #3, #6.

### Tasks

1. **Add Stripe env to `lib/env.ts`** — `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.
2. **`lib/stripe/client.ts`** — Stripe SDK init reading `env.stripe`.
3. **Seed tier prices.** Create three Stripe Price objects (one per
   tier), populate `tiers.stripe_price_id` via a follow-up migration
   or admin tier-editor (Track 6).
4. **Subscription Checkout creator** at
   `lib/stripe/subscription-checkout.ts` — used by the
   Awaiting_Payment → email-link flow (`stripe-architecture.md`
   §6.1). `mode: 'subscription'`.
5. **Customer Portal session creator** at
   `lib/stripe/customer-portal-session.ts` —
   `stripe-architecture.md` §7. Used by `/dashboard/billing` and
   `/renew`.
6. **Real webhook handler** at `app/api/webhooks/stripe/route.ts`.
   Signature verification first (raw body), idempotency via the
   five-event router in `stripe-architecture.md` §3. Routes via
   `metadata.flow` when distinguishing billing vs. tickets.
7. **Dunning cron** — Supabase scheduled function that re-fires the
   `dunning` email per `email-settings.dunning_retry_days` while
   `billing_status = 'past_due'` (`email-automation.md` §3.3, dedup
   via Track 4's send-log helper).
8. **501(c)(6) disclaimer** — configure in Stripe Dashboard's
   customer receipt footer per environment
   (`stripe-architecture.md` §5.1).

### Done-when

- Local `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  shows `invoice.paid` extending `memberships.expires_at` and
  flipping status to Active.
- `/dashboard/billing` "Manage in Stripe" opens a real portal session.
- A failed test charge fires the dunning email immediately.

### Status (2026-05-16)

Shipped (all code-only — no Stripe account provisioned yet):

- `lib/env.ts` exposes `env.stripe.secretKey`,
  `env.stripe.webhookSecret`, `env.stripe.publishableKey`.
- `lib/stripe/client.ts` — lazy SDK init pinned to
  `apiVersion: '2026-04-22.dahlia'`.
- `lib/stripe/subscription-checkout.ts` —
  `createSubscriptionCheckoutSession(profileId)`. Reads tier
  `stripe_price_id`; tags the session with
  `metadata.flow = 'billing'` and `metadata.profile_id` so the
  webhook can route it. Returns structured failure when the tier
  has no price yet (Stripe not provisioned) instead of throwing.
- `lib/stripe/customer-portal-session.ts` —
  `createCustomerPortalSession(profileId)`. Gracefully handles
  `no_customer` for Awaiting_Payment / Honorary members.
- `lib/stripe/tier-price-update.ts` — admin-driven dues edit per
  `stripe-architecture.md` §6.5. `updateTierDues` does the
  create-new + archive-old + swap-FK + migrate-subscribers dance
  with `proration_behavior: 'none'`. `seedTierPrice` is the
  first-time bootstrap path that creates the Stripe Product +
  initial Price. Track 6 calls these from the admin tier editor.
- `app/api/webhooks/stripe/route.ts` is the real handler.
  Signature verification reads the raw body before parsing.
  Routes `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Routes
  `checkout.session.completed` by `metadata.flow` so the same
  endpoint serves billing + tickets (Track 7 hooks in there).
  Calls `invokeMembershipStatusSync` for status flips — never
  writes `memberships.status` directly. Calls
  `sendTransactional` for receipt / dunning emails — dedup via
  `email_send_log` lives in that helper.
- `supabase/functions/dunning-cron/index.ts` — daily sweep over
  `billing_status = 'past_due'` memberships. Computes the next
  retry day from `email_settings.dunning_retry_days`, dedups by
  `(profile_id, 'dunning', subscription_id:day_bucket)` so each
  retry day fires at most once per past_due episode.
- `lib/stripe/actions.ts` — server actions
  `startSubscriptionCheckout` and `openCustomerPortal` that
  bridge the page-level forms to the Stripe creators above.
- `/dashboard/checkout` Pay button now submits to
  `startSubscriptionCheckout`. Falls back to a disabled state with
  explanatory copy when the selected tier has no
  `stripe_price_id` yet.
- `/dashboard/billing` "Manage in Stripe" button submits to
  `openCustomerPortal`.

Outstanding (waiting on Stripe credentials):

- Run `seedTierPrice` from the admin Tier configuration tab
  (Track 6) once per tier and per environment to populate
  `tiers.stripe_product_id` and `tiers.stripe_price_id`. Until
  then `startSubscriptionCheckout` returns
  `missing_price` and the page shows the disabled state.
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  smoke test once the Stripe CLI is connected to a test-mode
  account. Verify `invoice.paid` extends `expires_at` and the
  sync function flips status to `Active`.
- Configure the customer-receipt footer per environment in the
  Stripe Dashboard with the 501(c)(6) disclaimer
  (`stripe-architecture.md` §5.1). Manual step; can't be
  scripted via the API.
- Bind the `dunning-cron` Edge Function to a daily schedule via
  `supabase/config.toml` (or the Dashboard) and deploy with
  `supabase functions deploy dunning-cron`.
- Welcome / renewal-receipt / dunning email bodies are stubbed
  with console.info. Track 4 (Resend) swaps in the real send;
  call sites stay the same.

-----

## 7. Track 4 — Resend email layer

Every transactional and scheduled email moves through this track.

### Prerequisites

Track 1 (the `email_send_log` and `email_settings` rows exist),
blocking decisions #4, #7.

### Tasks

1. **Add Resend env** — `RESEND_API_KEY` (server-only) to
   `lib/env.ts`.
2. **`lib/resend/client.ts`** — Resend SDK init.
3. **`lib/resend/send.ts`** — the single send helper. Writes
   `email_send_log` BEFORE the Resend call, checks dedup
   `(profile_id, template, reference_id)` before firing
   (`email-automation.md` §4).
4. **Templates** — create the ten template entries from
   `email-automation.md` §5 in the Resend dashboard. Subject + body
   + plain text fallback. Footer per §6 with the 501(c)(6) disclaimer
   on dues-related templates.
5. **Scheduled cron** for renewal reminders (daily) and event
   reminders (hourly). Reads `email_settings.*_before` arrays at
   send time — never cached.
6. **Trigger wiring** — every spot in code where an email should fire
   (welcome on Active transition, registration confirmation on
   payment_status flip, etc.). Each call site must pass the right
   `reference_id` for dedup to work.

### Done-when

- Approving a member triggers the welcome email exactly once.
- Re-running the renewal-reminder cron produces no second send for
  the same member/template/reference.

-----

## 8. Track 5 — Member portal data wiring

Replaces every `mockMember` and `mockRegistrations` import with real
Supabase queries via the user-scoped client.

### Prerequisites

Track 1. Track 3 for the billing tab. Track 8's geocoder if pulling
directory work forward.

### Tasks

1. **`/dashboard` overview** — replace fixture reads with one query
   per card (membership, ce credits, directory listing, ethics
   signature, upcoming registrations).
2. **`/dashboard/profile`** — read live `profiles` row; server action
   to update `full_name` and `phone` (column-restricted per
   `data-model.md` §5.2).
3. **`/dashboard/directory`** — read the user's `directory_listings`
   row directly (not via the masked view); server action to write
   the toggle flags. Address change triggers re-geocode via the
   provider chosen in decision #1 (`directory-search.md` §4.2).
   Confirmation prompt on flipping `show_personal_mobile` /
   `show_address` to true (§5.4).
4. **`/dashboard/events`** — query `event_registrations` joined to
   `events`, scoped to the requester by RLS.
5. **`/dashboard/billing`** — wire "Manage in Stripe" to the
   Track 3 Customer Portal session creator.
6. **`/renew`** — same: status-aware copy stays, the disabled CTA
   becomes a real portal link.

### Done-when

- Every portal page renders the signed-in user's real data.
- No `mockMember` / `mockRegistrations` import remains under
  `app/(portal)/`.

-----

## 9. Track 6 — Admin portal data wiring

The volunteer board's UI. Every admin write goes through a server
action that logs to `admin_action_log` per `admin-portal.md` §7.

### Prerequisites

Track 1. Track 2 for status overrides. Track 3 for tier price edits.
Track 4 for resend-welcome and announcement sends.

### Tasks

1. **Members table** — Supabase query backing the columns + filters
   from `admin-portal.md` §4. Sort, filter, search via URL params.
   Member detail drawer at `/admin/members/[id]`.
2. **Row actions** — status override (calls
   `membership-status-sync`), resend welcome (calls Track 4 send),
   copy Stripe customer ID. Each writes `admin_action_log`.
3. **Bulk actions** — CSV export (server action streams the file),
   send announcement (composer + Track 4 broadcast).
4. **Admin event CRUD** — wire `/admin/events/new` form submit, the
   read-only `/admin/events/[id]` page becomes an editable form
   sharing components with `/new`, `/admin/events/[id]/rsvps`
   reads `event_registrations` and supports admin cancel
   (`events.md` §3).
5. **Settings tabs** — six sub-tabs from `admin-portal.md` §6.
   Logo upload to Supabase Storage. Tier configuration writes
   `tiers` directly. Branding accent color preview.
6. **Emails tab** — template body editor that syncs to Resend
   (`email-automation.md` §5). Send-timing editor that writes
   `email_settings`. Send-history audit reads `email_send_log`.
7. **Content tab** — `ContentEditor`'s save action persists the
   landing copy. (Storage destination TBD — small JSON column on a
   new `site_content` singleton table, or a dedicated rows-per-section
   table. Decide before this task starts.)

### Done-when

- Every disabled button in `app/admin/**` is either functional or
  removed.
- An admin action of every type appears in `admin_action_log`.

-----

## 10. Track 7 — Event ticketing

Public registration flow. One-off Stripe Checkout sessions, not
subscriptions.

### Prerequisites

Track 1 (events + event_registrations + RLS), Track 3 (Stripe
client + webhook router can dispatch to Checkout handler).

### Tasks

1. **Pricing resolver** at `lib/events/resolve-price.ts` —
   server-only, implements the matrix in `events.md` §4. Returns
   `{ cents, tier }`.
2. **Reserve-your-spot server action** — capacity check inside a
   `SELECT … FOR UPDATE` (or SERIALIZABLE) transaction per
   `events.md` §5. Creates the registration in `confirmed` /
   `waitlisted` per capacity. Skips Stripe for free.
3. **Ticket Checkout creator** at
   `lib/stripe/ticket-checkout.ts` — `mode: 'payment'`,
   `metadata.flow = 'tickets'`, success_url to
   `/events/[id]/confirmation`.
4. **Webhook routing for `checkout.session.completed`** in the
   Track 3 handler — read `metadata.event_registration_id`,
   flip `payment_status = 'paid'`, queue confirmation email.
5. **Waitlist promotion** — runs whenever a confirmed registration
   moves to `cancelled` (admin action or member self-cancel). Server
   action only. `events.md` §5.2.
6. **Waitlist payment expiry** — nightly job that marks pending
   registrations older than
   `email_settings.waitlist_payment_link_expiry_hours` as
   cancelled and re-fires waitlist promotion.
7. **`/events/[id]/confirmation`** — replace the mock-event lookup
   with a real registration read scoped to the requester
   (404 if not owned, per `auth-middleware.md` §3.2).

### Done-when

- A signed-in member buys a ticket, completes Checkout, lands on a
  confirmation page that reads their real registration, and gets the
  confirmation email.
- A guest can buy a ticket without an MPPGA account.

-----

## 11. Track 8 — Public directory (Phase 2 by default)

Only open this track if blocking decision #5 pulls it into Phase 1.
Spec already exists in `directory-search.md`.

### Prerequisites

Track 1, Track 5 §3 (the geocoder integration on save), blocking
decision #1.

### Tasks

1. **`directory_listings_public` masked view** —
   `directory-search.md` §3.2.
2. **`lib/directory/search.ts`** — server-only helper running the
   radius query against the view (§2.1).
3. **`/directory`** public page — search controls (radius, city,
   specialty), result list + (deferred) map view.
4. **`/directory/[profile_id]`** detail page — read-only public
   profile, never exposes a `show_*` flag value.
5. **Nav / Footer links** — only add once the page exists.

### Done-when

- An anonymous browser session can search by ZIP and find a member.
- Hidden listings are absent from results entirely, not
  visible-but-empty.

-----

## 12. What this doc is not

- **Not architecture.** Every track's *how* lives in its referenced
  rules file. Don't duplicate.
- **Not a sprint plan.** The tasks within a track are sequenced;
  the calendar mapping is up to whoever's scheduling the work.
- **Not exhaustive of Phase 2.** Donations, LMS-integrated CE,
  legislative tracking, and voting all live in
  `CLAUDE.md` §7 Open Architecture. Each needs a proposal before
  building, not a slot in this file.

When a track ships, strike it from §2 with a date and PR link rather
than deleting — the audit trail is useful.

-----

## 13. Constraints — MUST ADHERE

These reinforce the negative constraints in CLAUDE.md §10 by anchoring
them to the work that's most likely to violate them.

1. **NEVER write `memberships.status` from anywhere except the
   `membership-status-sync` Edge Function** (Track 2). Server actions
   for admin overrides call it; webhook handlers call it. Direct
   table writes from app code are a constraint violation.
2. **NEVER skip the `email_send_log` dedup check** before any
   automated send (Track 4). Webhook retries are exactly the
   scenario that produces duplicate welcome emails otherwise.
3. **NEVER trust the body of a Stripe webhook before verifying
   `stripe-signature`** (Track 3). The signature check is the gate
   that lets the service-role client be used downstream.
4. **NEVER hardcode tier IDs, prices, or `stripe_price_id` values**
   anywhere in application code (Tracks 3, 6). Read from `tiers`.
5. **NEVER expose service-role keys via `NEXT_PUBLIC_*`** (Tracks 3,
   4, all tracks). Service-role + Stripe + Resend secrets are
   server-only.
6. **NEVER store searcher geolocation** in Track 8. The center
   point is request-scoped.
7. **NEVER swap `(lng, lat)` for `(lat, lng)`** in any PostGIS
   `ST_MakePoint` call (Tracks 5, 8). Silent geographic nonsense
   otherwise.
8. **NEVER bypass RLS for convenience.** Service-role usage in
   Tracks 2, 3, 4, 6, 7 must be justified inline at each call site
   per `auth-middleware.md` §4.2.
