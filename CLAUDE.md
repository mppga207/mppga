# CLAUDE.md — MPPGA: Maine Professional Pet Groomers Association

## 1. Project Identity

**Client:** Maine Professional Pet Groomers Association (MPPGA) — a 501(c)(6) nonprofit professional trade association for pet groomers statewide in Maine. Public-facing site lives at `https://www.afterload.io/clients/mppga` (prototype). Production domain TBD. Contact: TBD.

**Purpose:** A custom-built membership platform replacing off-the-shelf AMS products (Wild Apricot, MemberClicks, etc.). Handles full member lifecycle: self-serve signup with auto-acceptance on successful payment, tiered dues billing, member portal, public geolocated directory, CE tracking, code of ethics compliance logging, volunteer admin tools, and event ticketing. Volunteer-run board with limited technical capacity — every feature must reduce manual email, spreadsheet, and approval tasks.

**Public Website — In Scope (Phase 1):** Home, Join Membership, Events, Contact.

**Public Website — Deferred (Phase 2+):** Resources, Sponsor page, Education page, Blog/News. Do not build until explicitly instructed.

**Business Context:**

- Membership pricing and tier specifics are TBD — confirm actual values with client before any seed data or hardcoding.
- Events feature is in scope: ticketed events with member vs. guest pricing, admin-created, RSVP/payment via Stripe Checkout. No real events exist yet.
- Nonprofit status: 501(c)(6). Dues are NOT tax-deductible as charitable contributions.
- Branding: Logo, colors, and fonts are established on the prototype. See `@.claude/rules/brand.md` before generating any public-facing UI. Do not invent brand assets.

**Member Portal — Deferred (Phase 2+):** CE tracking and Code of ethics signatures. The `ce_credits` and `compliance_logs` tables remain in `data-model.md` and the page files under `app/(portal)/dashboard/ce` and `app/(portal)/dashboard/ethics` stay in the codebase, but the navigation tabs are hidden. Saved for a future version — do not surface either tab without explicit instruction.

**Agent Role:** Technical lead for this client build. Prioritize data integrity, RLS security, and volunteer admin usability above all else. Apply nonprofit governance awareness to every decision — this platform handles legally binding votes, immutable compliance logs, and IRS-reportable financial data. Automate anything that would otherwise require manual board action.

**Tone for all user-facing text:** Warm, plain language. No jargon. Member-facing errors must be instructional (“Your membership has expired. Click here to renew” — never “403: subscription_status=lapsed”). Admin-facing messages can be direct and data-dense.

-----

## 2. Technology Stack

- **Runtime:** Node.js 22, TypeScript (strict mode — NEVER use `any`)
- **Framework:** Next.js 15 (App Router) — server components by default. NEVER use Pages Router.
- **Styling:** Tailwind CSS — NEVER use CSS modules or styled-components
- **Database:** Supabase (PostgreSQL) with PostGIS extension. RLS enforced on every table.
- **Auth:** Supabase Auth (JWT with custom claims: `role`, `membership_status`) — NEVER roll custom auth
- **Payments:** Stripe Billing (subscriptions) + Stripe Checkout (one-off event tickets) + Stripe Customer Portal
- **Storage:** Supabase Storage (signed URLs for CE certificates, member documents)
- **Email:** Resend (transactional: renewals, dunning, welcome, event confirmations)
- **Geospatial:** PostGIS on Supabase for radius-based directory search
- **Package Manager:** pnpm — NEVER use npm or yarn
- **Deployment:** Vercel (CLI or GitHub integration)
- **Environment variables:** See `.env.example`. Never hardcode values, even for testing.

-----

## 3. Core Data Model

Foundational schema. Never deviate from table names or field naming conventions without explicit instruction.

```
organizations       — Business entity (salon/clinic). Primary billing unit for the Salon tier.
profiles            — Extends auth.users. Links individual to org. Holds role + membership ref.
memberships         — Source of truth for access. Decoupled from Stripe billing_status.
                      Fields: stripe_sub_id, tier_id, status (Enum), billing_status, expires_at.
directory_listings  — Public-facing. PostGIS geography field for radius search. Visibility controls.
certifications      — Credentials per user. document_path → Supabase Storage bucket.
ce_credits          — CE hours per user. status: Pending | Approved. Linked to event or upload.
compliance_logs     — IMMUTABLE. Code of ethics signatures. signed_at + ip_address. Append-only.
tiers               — Tier config: pricing, benefit flags. Source of truth — never hardcode.
events              — Event records: date, location, member_price, guest_price, capacity.
event_registrations — Links profiles to events. Tracks payment_status + waitlist_position.
email_settings      — Singleton row. Admin-configurable send timing for all automated emails.
email_send_log      — Audit trail for every email sent. Checked before every automated send to prevent duplicates.
donations           — One-off or recurring donations. Deferred — schema placeholder only, no UI until Phase 2.
```

See `@.claude/rules/data-model.md` for full field specs, RLS policies, and migration files.

-----

## 4. Member Status State Machine

Member lifecycle flows through these statuses only. Never add statuses without updating all consuming logic.

```
Awaiting_Payment → Active → Grace_Period → Lapsed
                         ↘ Suspended
                         ↘ Honorary
```

- `Awaiting_Payment` = signed up, email verified, dues not yet paid. Redirected to /dashboard/checkout on every route.
- `Active` = full portal + directory access + event member pricing
- `Grace_Period` = read-only portal, no directory listing, renewal prompt on every page
- `Lapsed` = redirect to /renew on every authenticated route
- `Suspended` = admin-only override, requires admin action
- `Honorary` = lifetime access, no billing, admin-assigned only

There is no board-review step. A successful email + password signup creates the membership row in `Awaiting_Payment`; the first successful Stripe invoice promotes it to `Active`. Admins can still manually flip status (suspend, grant Honorary) via the status-override path.

Grace period = 30 days from `expires_at`. Status transitions handled exclusively by the Supabase Edge Function in `functions/membership-status-sync`. NEVER apply transition logic in client-side code.

-----

## 5. Membership Tiers

Tier config lives in the `tiers` table. NEVER hardcode tier IDs, pricing, or benefit flags in components.

```
Basic Membership — Entry tier. Member event pricing. Directory listing optional.
Professional     — Standard. Directory listing. Full portal.
Salon            — Premium. Umbrella account. Sub-profiles for staff. Priority directory.
```

-----

## 6. Payment Architecture

Stripe is the sole processor. Two distinct flows — never conflate them:

1. **Stripe Billing** → recurring membership dues (subscriptions). Updates `memberships` via webhook.
1. **Stripe Checkout** → one-off event tickets. Updates `transactions` + `event_registrations` via webhook.

All billing state flows through: Stripe Webhooks → `app/api/webhooks/stripe/route.ts` → Supabase. Webhook handler must be idempotent. Handle: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`, `checkout.session.completed`.

501(c)(6) compliance: Every receipt must include the statutory disclaimer that dues are not tax-deductible as charitable contributions but may be deductible as ordinary business expenses.

See `@.claude/rules/stripe-architecture.md` for webhook logic, proration, and dunning sequence.

-----

## 7. Decided vs. Open Architecture

### Decided (Do Not Modify Without Explicit Instruction)

- **Auth:** Supabase Auth only. Do not propose NextAuth, Clerk, or any alternative.
- **Payments:** Stripe only. Do not add PayPal or any secondary processor.
- **RLS:** Every table must have RLS enabled. Never disable RLS to simplify a query — rewrite the query.
- **Compliance logs:** `compliance_logs` is append-only. No UPDATE or DELETE, ever.

### Open (Propose Before Building)

- **Email provider:** Resend is confirmed. Propose alternatives in plan mode if volume/cost is a concern.
- **Donations/sponsorships:** Schema placeholder (`donations` table) exists. No UI or Stripe flow until Phase 2 — propose approach before building.
- **LMS integration:** CE delivery via external LMS is a future phase. Propose approach before building.
- **Legislative tracking:** Open States API integration planned but unscoped. Proposal required before any work.
- **Mobile app:** Not in scope. Do not propose native mobile solutions.
- **Social media integration:** Facebook, Instagram, private member group are client-managed externally. No social API integrations planned — do not propose them.

-----

## 8. Navigation

Do not infer. Read the relevant file before engaging with each subsystem.

- Data model + RLS policies: `@.claude/rules/data-model.md`
- Stripe webhook logic + dunning: `@.claude/rules/stripe-architecture.md`
- Auth middleware + route protection: `@.claude/rules/auth-middleware.md`
- Directory + PostGIS queries: `@.claude/rules/directory-search.md`
- Admin portal — routes, components, tokens, tab specs: `@.claude/rules/admin-portal.md`
- Email automation sequences: `@.claude/rules/email-automation.md`
- Event ticketing flow: `@.claude/rules/events.md`
- Brand: colors, fonts, logo usage: `@.claude/rules/brand.md`
- Phase 1 buildout — sequenced punch list, blocking decisions, track dependencies: `@.claude/rules/phase-1-buildout.md`

-----

## 9. Migration Ledger

What's been applied to the production Supabase project. Update this list whenever a new migration ships and is run; it's the only source of truth for "what does the live DB look like right now."

**Applied through `20260517000003_contact_submissions.sql`** (as of 2026-05-17). Every migration file in `supabase/migrations/` up to and including this one is live.

**Pending:**

- `20260517000004_auth_hook_app_metadata.sql` — fixes the JWT custom-claims hook to write under `app_metadata` so the middleware can actually read `role` and `membership_status` off the JWT. Without this applied, admin sign-ins land on `/dashboard` even with `profiles.role = 'admin'` and the hook bound.
- `20260517000005_signup_skip_payment.sql` — adds a `signup_skip_payment` boolean column to `site_settings`. Backs the testing toggle in Admin → Settings that promotes new signups straight to `Active` while Stripe isn't wired up.
- `20260517000006_remove_voting_rename_tiers.sql` — drops the `voting_rights` column from `tiers`, renames `corporate_umbrella` to `umbrella_account`, and updates the seeded rows so "Student / Apprentice" becomes "Basic Membership" (slug `basic`) and "Corporate / Salon" becomes "Salon" (slug `salon`). Drops voting as a planned feature.
- `20260517000007_search_organizations_rpc.sql` — adds a `search_organizations(p_query, p_limit)` security-definer function that returns up to 8 `(id, name)` matches for the `/join` salon typeahead. Anon + authenticated execute; the row-level policy on `organizations` stays admin-only.
- `20260517000008_profile_full_name_from_metadata.sql` — patches the `create_profile_on_signup` trigger to copy `full_name` out of `raw_user_meta_data` so the join form's name actually lands on the profile. Backfills any existing rows whose name went missing from the previous version of the trigger.
- `20260517000009_tiers_employee_limit.sql` — adds `umbrella_employee_limit` (nullable integer) to `tiers` so the admin tier editor and public Join page can render "Covers a salon with up to N employees" instead of the bare "Umbrella account" flag. Constrained positive when set, and gated on `umbrella_account = true`. Seeds Salon to 5.

Manual configuration steps that don't live in a migration but must be done per environment:

- Bind `public.handle_auth_jwt_claims` in Supabase Dashboard → Auth → Hooks → Custom Access Token. Without this, the `role` and `membership_status` JWT claims default and the admin portal is unreachable.
- Deploy Edge Functions: `supabase functions deploy membership-status-sync dunning-cron renewal-reminders-cron event-reminders-cron event-waitlist-cron`.
- Schedule the cron Edge Functions (Dashboard → Edge Functions → Schedules, or pg_cron): daily for `renewal-reminders-cron` + `dunning-cron`, hourly for `event-reminders-cron` + `event-waitlist-cron`.
- Configure the 501(c)(6) disclaimer in the Stripe Dashboard's customer-receipt footer per environment (`stripe-architecture.md` §5.1).

When a new migration is added: append its filename to this section in the same PR, and note whether it's been applied yet ("Pending" until it runs).

-----

## 10. Verification Workflows

Before concluding any task:

- **Tests:** Run `pnpm run test`. Cover all membership status transitions and webhook handlers.
- **Lint:** Run `pnpm run lint:fix` then `pnpm run typecheck`. Both must pass clean.
- **RLS check:** After any schema change, verify RLS policies enforce correctly for anon, authenticated, and admin roles. Run `pnpm run test:rls` if available.
- **Stripe webhooks:** Test locally with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` before deploying any billing changes.
- **Errors:** Never suppress. Read the traceback, fix the root cause, re-run.

-----

## 11. Negative Constraints — MUST ADHERE

1. **NEVER disable RLS on any table:** Security is non-negotiable. Rewrite the query instead.
1. **NEVER update membership_status from client-side code:** All status transitions go through server-side Edge Functions or Route Handlers only.
1. **NEVER write to compliance_logs with UPDATE or DELETE:** Append-only audit trail.
1. **NEVER hardcode tier IDs, pricing, or benefit flags:** All tier logic reads from the `tiers` table.
1. **NEVER use npm or yarn:** pnpm only.
1. **NEVER redirect lapsed users to a generic 403:** Always redirect to /renew with their renewal context intact.
1. **NEVER store Stripe webhook events without signature verification:** Validate `stripe-signature` header before processing.
1. **NEVER expose personal mobile numbers in the public directory without explicit member opt-in:** Default `directory_listings` visibility for personal contact fields is `false`.
1. **NEVER issue receipts without the 501(c)(6) disclaimer:** All Stripe-generated invoices and custom receipts must include IRS-required language distinguishing dues from charitable contributions.
1. **NEVER apply membership status transitions in client-side code:** Edge Functions only.
1. **NEVER use the `any` TypeScript type:** Strict mode is required. Type everything explicitly.
1. **NEVER use the Pages Router:** App Router only across the entire project.
1. **NEVER use NEXT_PUBLIC_ on sensitive keys:** Service role keys and API secrets are server-side only.
1. **NEVER conflate Stripe Billing and Stripe Checkout flows:** Subscriptions → `memberships`. One-off tickets → `transactions` + `event_registrations`. These are separate pipelines.
1. **NEVER use em dashes (—) in copy or code:** Not in user-facing text, JSX (`&mdash;`), comments, or markdown. Use commas, periods, parentheses, or colons instead. Applies to member-facing, admin-facing, and public website surfaces. Single hyphen ("-") is fine for placeholder values like missing-data dashes.
