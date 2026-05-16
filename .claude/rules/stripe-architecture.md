# MPPGA Stripe Architecture — Webhooks, Dunning, Receipts

Read this before touching anything under `app/api/webhooks/stripe`,
any server action that talks to Stripe, the Billing tab in either
portal, or the membership-status-sync Edge Function.

This file defines:

1. The two flows — Stripe Billing vs. Stripe Checkout — and which
   tables each one writes
2. The webhook handler: signature verification, idempotency, event
   routing
3. The five events the handler must handle and how each one maps to
   `memberships` / `event_registrations` writes
4. The dunning sequence and its handoff to email automation
5. Refunds, cancellations, proration
6. The 501(c)(6) disclaimer rule
7. The Stripe Customer Portal — when to use it, when not to
8. Hard constraints

Companion specs:

- `@.claude/rules/data-model.md` — the `memberships`, `tiers`,
  `events`, `event_registrations` tables this file writes to
- `@.claude/rules/auth-middleware.md` — webhooks bypass auth
  middleware; route handler validates the signature instead
- `@.claude/rules/email-automation.md` — dunning + receipt sends
- `@.claude/rules/events.md` — the events ticketing flow that uses
  Stripe Checkout

-----

## 1. Two flows — never conflate them

Stripe is the sole processor (CLAUDE.md §7). Two distinct flows
share one webhook endpoint but write to different tables:

| Flow | Stripe object | Writes to | Trigger |
|---|---|---|---|
| **Stripe Billing** | `Subscription` + recurring `Invoice` | `memberships` | Member joins or renews dues |
| **Stripe Checkout** | One-off `Checkout Session` + `PaymentIntent` | `event_registrations` | Member or guest buys an event ticket |

CLAUDE.md constraint #15: never blur the two pipelines. A `Checkout`
session never touches `memberships`. A `Subscription` event never
touches `event_registrations`. The webhook handler routes by event
type; if a future event type doesn't clearly belong to one flow,
add a discriminator (`metadata.flow = 'billing'|'tickets'`) before
introducing the handler.

Free events skip Stripe entirely (`events.md` §6) — no
`checkout.session.completed` will fire, the route never gets called.
Set `event_registrations.payment_status = 'free'` in the server
action that creates the registration.

-----

## 2. The webhook handler

### 2.1 Endpoint

`app/api/webhooks/stripe/route.ts` — single shared route for both
flows. POST only. Middleware does not auth-gate webhook paths
(`auth-middleware.md` §3) — the handler is responsible for its own
trust.

### 2.2 Signature verification

The first thing the handler does, before parsing the body:

```ts
const sig = request.headers.get("stripe-signature");
const raw = await request.text();
let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(raw, sig, env.stripe.webhookSecret);
} catch {
  return new Response("Invalid signature", { status: 400 });
}
```

- Read the raw body with `request.text()` — do NOT call
  `request.json()` first; signature verification needs the bytes
  exactly as Stripe sent them.
- `STRIPE_WEBHOOK_SECRET` is server-only. Never exposed via
  `NEXT_PUBLIC_*` (CLAUDE.md constraint #14).
- An invalid signature returns 400 with no body. Never log the
  raw payload — it can contain customer email addresses.
- A missing signature is a 400. Never trust a body without one.

### 2.3 Idempotency

Stripe redelivers events on any non-2xx response (and sometimes
even after a 2xx, briefly). Every handler must be idempotent. The
discipline:

1. Use `stripe_subscription_id`, `stripe_customer_id`, or
   `stripe_checkout_session_id` (whichever the event provides) as
   the natural key. These are unique on their tables per
   `data-model.md` §6.
2. Write with `INSERT ... ON CONFLICT DO UPDATE` or the equivalent
   "read, decide, write" inside a transaction.
3. Never re-fire side effects (email sends, status transitions)
   without first checking they haven't happened — `email_send_log`
   dedup index covers email; status writes are no-ops when the
   value already matches.

Return 200 on duplicate delivery. Don't 4xx — Stripe will retry,
which is worse than acknowledging.

### 2.4 The service-role client

The handler uses `createServiceRoleClient()`
(`lib/supabase/server.ts`) for every write. RLS blocks
`memberships` and `event_registrations` from any non-service-role
write (`data-model.md` §5.4, §5.10). The signature check is the
gate; once we're past it, the body is trusted and the service-role
client is appropriate.

CLAUDE.md constraint: every service-role call site needs a one-line
comment explaining why RLS can't carry the request. The Stripe
webhook handler is the canonical valid case.

### 2.5 Event log

Optional but recommended: a `stripe_events` table that records every
processed Stripe event ID, with a unique constraint on
`stripe_event_id`. The handler inserts a row before processing;
duplicate deliveries fail the insert and exit early. Cheaper than
the per-table idempotency dance for events that touch multiple
tables.

```
stripe_events
| id                  uuid PK
| stripe_event_id     text UNIQUE
| event_type          text
| processed_at        timestamptz
| payload_hash        text   -- SHA-256 of the raw event JSON
```

If we add this table, it goes into `data-model.md` first. Until
then, the per-table idempotency keys are sufficient.

-----

## 3. Events the handler must handle

The five events listed in CLAUDE.md §6, plus the dispatch logic:

| Event | Flow | Behavior |
|---|---|---|
| `invoice.paid` | Billing | Set `memberships.billing_status = 'current'`, extend `expires_at`, call `membership-status-sync` to move status to `Active`. Email: receipt (with 501(c)(6) disclaimer). |
| `invoice.payment_failed` | Billing | Set `billing_status = 'past_due'`. Start dunning (§ 4). Status does NOT change here — `Grace_Period` / `Lapsed` transitions are driven by the time-based sync function, not the webhook. |
| `customer.subscription.updated` | Billing | Mirror Stripe's `status` into `memberships.billing_status`. If the customer changed tier (proration; § 6), update `tier_id`. |
| `customer.subscription.deleted` | Billing | Set `billing_status = 'canceled'`. Call `membership-status-sync`; if `expires_at` has passed, status flips to `Lapsed`. |
| `checkout.session.completed` | Checkout | Set `event_registrations.payment_status = 'paid'`, write the `stripe_checkout_session_id`, send the event confirmation email. |

Every other event type is logged and returned 200. Stripe sends a
lot of noise — don't 4xx unknown events, just acknowledge.

### 3.1 What the handler does NOT do

- NEVER writes `memberships.status` directly. Status writes go
  through `membership-status-sync` (CLAUDE.md constraint #2). The
  webhook handler updates `billing_status` and `expires_at`, then
  invokes the Edge Function which decides the membership status.
- NEVER sends email directly. Queues the send via
  `lib/email/send.ts` (TBD) which writes `email_send_log` and calls
  Resend. The dedup index in `email_send_log` is what makes
  redelivery safe.
- NEVER creates new `memberships` rows. The join flow
  (`auth-middleware.md` §6.1) creates the row in
  `Pending_Approval`; the webhook only ever updates an existing
  row. If a webhook arrives with no matching
  `stripe_customer_id` / `stripe_subscription_id`, log loudly and
  return 200 — refusing the delivery doesn't help, and the issue
  is upstream.

-----

## 4. Dunning sequence

Triggered by `invoice.payment_failed` on a Billing subscription.

### 4.1 Schedule

Read from `email_settings.dunning_retry_days` (default `[3, 7, 14]`).
Admin-configurable per `email-automation.md` §3.3 — never hardcode
the retry days.

### 4.2 Flow

1. **Day 0 (immediate)** — webhook fires the `dunning` email
   template (`email-automation.md` §3.3). Email includes a link
   straight into the Stripe Customer Portal so the member can update
   their card.
2. **Day 3 / 7 / 14** — scheduled job (Supabase cron + Edge
   Function) re-sends the same template if `billing_status` is still
   `past_due` and no `invoice.paid` has arrived. Each send is
   dedup'd via `email_send_log` keyed on
   `(profile_id, 'dunning', stripe_subscription_id)` plus a day
   bucket so the same retry doesn't fire twice.
3. **Grace_Period** — when `expires_at` passes,
   `membership-status-sync` flips status to `Grace_Period`. The
   dashboard renders the renewal banner (CLAUDE.md §4). Dunning
   emails continue per the schedule.
4. **Lapsed** — 30 days after `expires_at`, the sync function flips
   to `Lapsed`. Dunning stops; member can still self-renew via
   `/renew`.

If `invoice.paid` arrives at any point, the chain stops:
`billing_status` flips back to `current`, status returns to
`Active`, and a renewal receipt goes out.

### 4.3 Suspended / admin override

`Suspended` is admin-only (CLAUDE.md §4) — never set by a webhook.
The webhook handler must treat a `Suspended` member as opaque:
update billing fields and email as usual, but do not change status.
Only the admin override path or the sync function writes status.

-----

## 5. Receipts

Every Billing payment generates a Stripe-hosted receipt plus our own
confirmation email.

### 5.1 The 501(c)(6) disclaimer

MPPGA is a 501(c)(6) trade association (CLAUDE.md §1). Dues are NOT
deductible as charitable contributions. Every receipt — Stripe-issued
or our own — must include:

> Dues paid to MPPGA are not deductible as charitable contributions
> for federal income tax purposes but may be deductible as ordinary
> business expenses.

Two places this lives:

1. **Stripe customer-facing receipts** — configured per environment
   in Stripe Dashboard → Settings → Emails → "Footer text". Set
   once per environment; verify on staging before flipping
   production.
2. **Our own receipt emails** — included in the welcome and renewal
   templates (`email-automation.md` §6). The footer is shared
   across every dues-related send.

Event ticket receipts are also one-off transactions, but tickets
are NOT dues — the disclaimer is not legally required there. Keep
it off ticket confirmations to avoid muddying the message.

CLAUDE.md constraint #10: NEVER issue a dues receipt without the
disclaimer. The constraint applies to both Stripe's receipt and
ours.

### 5.2 Invoice numbering

Stripe assigns invoice numbers per customer (e.g. `MPPGA-0001`).
Configure the prefix once per environment; never overwrite an
existing customer's invoice prefix retroactively.

-----

## 6. Subscription mechanics

### 6.1 Initial subscription (the join flow)

Per `auth-middleware.md` §6.1:

1. Member completes join form → `memberships` row inserted with
   `tier_id` and `status = 'Pending_Approval'`.
2. Board approves → status flips to `Awaiting_Payment` and an email
   goes out with a Stripe Checkout link **for the subscription**
   (not a one-off Checkout — `mode: 'subscription'`).
3. Member completes Checkout → Stripe creates the
   `Customer` + `Subscription` and fires the first invoice paid
   event.
4. Webhook handler writes `stripe_customer_id`,
   `stripe_subscription_id`, `billing_status = 'current'`,
   `expires_at = <subscription_period_end>`, and calls
   `membership-status-sync` which flips status to `Active`.
5. Welcome email fires once (dedup'd via `email_send_log`).

The subscription-mode Checkout is distinct from event-ticket
Checkout (§ 8) — different `mode`, different success URLs, different
metadata, different webhook downstream.

### 6.2 Renewals

Stripe handles the recurring charge automatically. The handler only
sees `invoice.paid` (or `invoice.payment_failed`). On success:

- Extend `expires_at` to the new period end.
- Reset `billing_status` to `current` if it was `past_due`.
- Renewal receipt email (`email-automation.md` reuses the `welcome`
  template variant or a dedicated `renewal-receipt` key — TBD,
  decide in email work).

Renewal reminders (the heads-up emails 30/7/1 days before expiry)
come from a scheduled job querying `expires_at`, not from any
webhook event. See `email-automation.md` §3.2.

### 6.3 Tier changes (proration)

Admin moves a member from Professional to Corporate (or vice versa)
via the Members admin tab. The flow:

1. Server action calls `stripe.subscriptions.update(sub_id, {
   items: [{ id, price: newPriceId }], proration_behavior:
   'create_prorations' })`.
2. Stripe issues a prorated invoice. `invoice.paid` fires (if the
   prorated amount is positive) or the proration is applied as a
   credit (if negative — downgrade).
3. `customer.subscription.updated` fires. Handler reads the new
   `price_id`, maps it to `tier_id` via the `tiers.stripe_price_id`
   column, and updates `memberships.tier_id`.
4. Admin action is logged in `admin_action_log` with
   `action = 'tier_change'` and a payload containing the old/new
   tier IDs.

Tier slugs and IDs are read from the `tiers` table (CLAUDE.md
constraint #5). Never hardcode a Stripe price ID in application
code — look it up by tier.

### 6.4 Cancellation

Two paths:

| Initiator | Mechanism | Webhook event |
|---|---|---|
| Member, self-serve | Stripe Customer Portal → cancel | `customer.subscription.deleted` (at period end) or `.updated` (`cancel_at_period_end: true`) |
| Admin override | Server action → `stripe.subscriptions.cancel()` | `customer.subscription.deleted` |

In both cases the handler sets `billing_status = 'canceled'`. The
sync function decides when to flip status — typically a member
who cancels mid-period stays `Active` until `expires_at` passes,
then transitions through `Grace_Period` to `Lapsed` per the normal
state machine.

Never delete the `memberships` row. Cancellation is a status, not
a destruction.

-----

## 7. Stripe Customer Portal

Members manage their own card and cancel via Stripe's hosted
portal. Server action at `lib/stripe/customer-portal-session.ts`
(TBD):

```ts
const session = await stripe.billingPortal.sessions.create({
  customer: membership.stripe_customer_id,
  return_url: `${env.siteUrl}/dashboard/billing`,
});
return session.url;
```

- Only render the portal link if `stripe_customer_id` is set —
  pending/awaiting-payment members don't have one yet.
- Honorary members never have one (no subscription).
- The portal handles card updates, invoice history download, and
  cancellation. Don't build a custom UI for any of those — Stripe
  does it correctly and we don't want to maintain it.
- What the portal does NOT do: change tier (handled admin-side per
  § 6.3), refund tickets (one-off Checkout, separate flow).

-----

## 8. Stripe Checkout for event tickets

The non-recurring path. Specced in `events.md` §6.

### 8.1 Creating a session

Server action — never client side, never recalculate price client
side:

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price_data: ..., quantity: 1 }],
  success_url: `${env.siteUrl}/events/${eventId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${env.siteUrl}/events/${eventId}`,
  customer_email: profile.email,
  metadata: {
    flow: 'tickets',
    event_id: eventId,
    event_registration_id: regId,
    profile_id: profileId,
  },
});
```

- Price is resolved by the pricing function in `events.md` §4 —
  member vs. guest, lapsed-member fallback per event. Server-side
  only.
- `mode: 'payment'` — one-off charge, no subscription side effects.
- Metadata carries everything the webhook needs to route. Never
  rely on parsing the line-item description.

### 8.2 Webhook handling

`checkout.session.completed`:

1. Read `metadata.event_registration_id`.
2. Update the registration: `payment_status = 'paid'`,
   `stripe_checkout_session_id = session.id`.
3. Queue the `event-confirmation` email (`email-automation.md`
   §3.4). Dedup key: `(profile_id, 'event-confirmation',
   event_registration_id)`.
4. If the registration is on the waitlist (it shouldn't be —
   waitlist-promotion payment is the same flow, just a different
   trigger), promote it.

Failed payment attempts on Checkout don't generate a webhook event
we act on — the user simply returns to `cancel_url` and the
registration stays `pending`. A nightly cleanup job marks
`pending` registrations older than `email_settings.waitlist_payment_link_expiry_hours`
as `cancelled` so the waitlist can roll forward.

### 8.3 Refunds

Admin-initiated only. Server action:

1. `stripe.refunds.create({ payment_intent })`.
2. Update `event_registrations.payment_status = 'refunded'`.
3. Update `event_registrations.status = 'cancelled'`.
4. Trigger waitlist promotion (`events.md` §5.2).
5. Log in `admin_action_log` with payload `{ event_registration_id,
   refund_id, amount_cents }`.

Members cannot self-refund. The Customer Portal (§ 7) is for
subscriptions only; ticket refunds go through the board.

-----

## 9. Local development

```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

CLAUDE.md §9 calls this out explicitly. The Stripe CLI prints a
local `STRIPE_WEBHOOK_SECRET` — paste it into `.env.local`; never
into `.env` or anything committed.

Test cards: use Stripe's documented test numbers. Never use real
cards on staging. Production-like flows can be smoked via Stripe's
test mode without touching real money.

-----

## 10. Environment variables

| Var | Where read | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `lib/stripe/*` server-only | Never `NEXT_PUBLIC_*` |
| `STRIPE_WEBHOOK_SECRET` | webhook route | Different value per environment |
| `STRIPE_PUBLISHABLE_KEY` | client (`NEXT_PUBLIC_*` allowed) | Used only if we ever embed Stripe Elements; not currently needed since Checkout + Portal are both hosted |

Read via `lib/env.ts`. Never reference `process.env` directly
elsewhere (the pattern is set in `lib/env.ts`).

-----

## 11. Constraints — MUST ADHERE

1. NEVER process a webhook without verifying `stripe-signature`
   (CLAUDE.md constraint #8).
2. NEVER write `memberships.status` from the webhook handler
   (CLAUDE.md constraint #2). Update `billing_status` and
   `expires_at`; call `membership-status-sync` to decide status.
3. NEVER conflate Billing and Checkout flows (CLAUDE.md
   constraint #15). Subscriptions → `memberships`. Tickets →
   `event_registrations`.
4. NEVER issue a dues receipt without the 501(c)(6) disclaimer
   (CLAUDE.md constraint #10).
5. NEVER hardcode a Stripe price ID. Look it up via
   `tiers.stripe_price_id` (CLAUDE.md constraint #5).
6. NEVER fire an email send without writing `email_send_log` first
   (`email-automation.md` §4). Webhook redelivery is exactly the
   scenario the dedup index protects against.
7. NEVER call `createServiceRoleClient()` before the signature
   check. The signature is the gate.
8. NEVER parse the request body before signature verification —
   the verifier needs raw bytes.
9. NEVER return non-2xx for an unknown event type. Acknowledge
   (200) and log. Stripe will hammer the endpoint otherwise.
10. NEVER expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` via
    `NEXT_PUBLIC_*` (CLAUDE.md constraint #14).
11. NEVER calculate ticket price on the client. Always resolve
    server-side per `events.md` §4 before creating the Checkout
    session.
12. NEVER delete a `memberships` row on cancellation. Cancellation
    is a status, not a destruction.
