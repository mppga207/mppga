# MPPGA Events — Architecture & Flow Spec

Read this before touching any event route, component, or database query.

-----

## 1. Scope

Events cover: workshops, clinics, meetups, mock competitions, and the annual meeting. Future online/CE education is out of scope for this phase — see `@CLAUDE.md` Open Architecture.

-----

## 2. Data Model

### `events` table

|Field                  |Type         |Notes                                                                          |
|-----------------------|-------------|-------------------------------------------------------------------------------|
|`id`                   |`uuid`       |PK                                                                             |
|`title`                |`text`       |Required                                                                       |
|`description`          |`text`       |Optional, shown on public event page                                           |
|`date`                 |`timestamptz`|Event start datetime                                                           |
|`end_date`             |`timestamptz`|Optional end datetime                                                          |
|`location`             |`text`       |City/venue string                                                              |
|`member_price`         |`integer`    |Cents. 0 = free for members                                                    |
|`guest_price`          |`integer`    |Cents. Always ≥ member_price                                                   |
|`capacity`             |`integer`    |Hard cap. Required.                                                            |
|`waitlist_enabled`     |`boolean`    |Default true. Admin toggle per event.                                          |
|`lapsed_member_pricing`|`text`       |Enum: `member` or `guest`. Admin toggle per event.                             |
|`status`               |`text`       |Enum: `draft` or `published`. Admin sets directly — no board approval required.|
|`created_by`           |`uuid`       |FK → `profiles.id`                                                             |
|`created_at`           |`timestamptz`|Auto                                                                           |
|`updated_at`           |`timestamptz`|Auto                                                                           |

### `event_registrations` table

|Field                       |Type         |Notes                                                |
|----------------------------|-------------|-----------------------------------------------------|
|`id`                        |`uuid`       |PK                                                   |
|`event_id`                  |`uuid`       |FK → `events.id`                                     |
|`profile_id`                |`uuid`       |FK → `profiles.id`                                   |
|`price_paid`                |`integer`    |Cents. Snapshot at time of registration.             |
|`pricing_tier`              |`text`       |Enum: `member`, `guest`. Logged at registration time.|
|`payment_status`            |`text`       |Enum: `pending`, `paid`, `refunded`, `free`          |
|`stripe_checkout_session_id`|`text`       |Null if free                                         |
|`waitlist_position`         |`integer`    |Null if confirmed. >0 = waitlisted.                  |
|`status`                    |`text`       |Enum: `confirmed`, `waitlisted`, `cancelled`         |
|`registered_at`             |`timestamptz`|Auto                                                 |

-----

## 3. Admin Capabilities

### Creating / Editing Events

- Any admin can publish directly. No board approval step.
- Status toggle: `draft` → `published` is a single field update. Published events are immediately visible on the public Events page.
- Admin sets per-event:
  - `waitlist_enabled` (bool) — when true, registrations beyond capacity land on the waitlist automatically.
  - `lapsed_member_pricing` — toggle: `member` pricing or `guest` pricing for lapsed/grace-period members. Default: `guest`.

### RSVP Management

- Admin can view all registrations per event (confirmed + waitlisted).
- Admin can cancel any registration. Cancellation triggers the waitlist promotion flow (see § 5).
- Admin can manually move a waitlisted registrant to confirmed if capacity allows.

-----

## 4. Pricing Logic

Pricing is determined at registration time and snapshotted into `event_registrations.price_paid` and `pricing_tier`. Never recalculate after the fact.

```
if membership_status === 'Active' OR 'Honorary':
  → member_price, pricing_tier = 'member'

if membership_status === 'Grace_Period' OR 'Lapsed':
  → check event.lapsed_member_pricing
  → if 'member': member_price, pricing_tier = 'member'
  → if 'guest':  guest_price,  pricing_tier = 'guest'

if not authenticated OR membership_status === 'Suspended':
  → guest_price, pricing_tier = 'guest'

if member_price === 0 AND pricing_tier === 'member':
  → payment_status = 'free', skip Stripe
```

Never apply pricing logic on the client side. Always resolve in a server action or API route.

-----

## 5. Registration & Waitlist Flow

### Registration

```
1. User initiates RSVP
2. Server checks current confirmed registration count against event.capacity
3. If count < capacity:
   → Create event_registration (status: confirmed)
   → If price > 0: create Stripe Checkout session → redirect
   → If price = 0: set payment_status = 'free', send confirmation email
4. If count >= capacity AND waitlist_enabled:
   → Create event_registration (status: waitlisted, waitlist_position = next in queue)
   → Send waitlist confirmation email
5. If count >= capacity AND waitlist_enabled = false:
   → Return error: event is full. No registration created.
```

Capacity check must be done inside a Postgres transaction to prevent race conditions. Use `SELECT ... FOR UPDATE` on the events row or a `SERIALIZABLE` transaction.

### Waitlist Promotion

Triggered when a confirmed registration is cancelled (by admin or member):

```
1. cancelled registration → status = 'cancelled'
2. Query lowest waitlist_position for this event where status = 'waitlisted'
3. If found:
   → Update that registration: status = 'confirmed', waitlist_position = null
   → If price > 0: send payment email with Stripe Checkout link (expires in 24h)
   → If price = 0: send confirmation email, set payment_status = 'free'
4. If not found: capacity slot opens with no action
```

Waitlist promotion runs server-side only — Edge Function or Route Handler. Never client-side.

-----

## 6. Stripe Integration

Event tickets use **Stripe Checkout** (one-off, not subscriptions). Never conflate with Stripe Billing.

```
Stripe Checkout session created →
  success_url: /events/{event_id}/confirmation
  cancel_url:  /events/{event_id}
  metadata: { event_registration_id, profile_id, event_id }

Webhook: checkout.session.completed →
  → Update event_registrations.payment_status = 'paid'
  → Update event_registrations.stripe_checkout_session_id
  → Send confirmation email via Resend
```

Webhook handler lives at `app/api/webhooks/stripe/route.ts` (shared with membership webhook). Route handler must validate `stripe-signature` and handle idempotency — `checkout.session.completed` can fire more than once.

Free events skip Stripe entirely. Set `payment_status = 'free'` and send confirmation email directly.

-----

## 7. Public-Facing Routes

|Route                      |Content                                                         |
|---------------------------|----------------------------------------------------------------|
|`/events`                  |List of all published events. Past events hidden or collapsed.  |
|`/events/[id]`             |Event detail: description, date, location, pricing, RSVP button.|
|`/events/[id]/confirmation`|Post-payment confirmation page. Requires valid registration.    |

Only `published` events appear on public routes. `draft` events are admin-only.

Member pricing display: show both member and guest price. If user is authenticated and Active, highlight member price. If not authenticated, prompt to join/sign in to access member pricing.

-----

## 8. Email Triggers (via Resend)

|Trigger                              |Recipient                |Template                                           |
|-------------------------------------|-------------------------|---------------------------------------------------|
|Registration confirmed (paid or free)|Registrant               |Event confirmation                                 |
|Waitlist confirmed                   |Registrant               |Waitlist confirmation                              |
|Waitlist promoted + payment required |Registrant               |Payment link (24h expiry)                          |
|Waitlist promoted + free             |Registrant               |Confirmation (no payment)                          |
|Event reminder                       |All confirmed registrants|Event reminder — timing set in admin Email settings|
|Registration cancelled by admin      |Registrant               |Cancellation notice                                |

See `@.claude/rules/email-automation.md` for template specs and Resend integration.

-----

## 9. RLS Policies

- `events`: anon can read `published` rows only. Admin can read/write all rows.
- `event_registrations`: authenticated users can read their own rows. Admin can read/write all rows. Never expose another member’s registration to a non-admin.

Never disable RLS to simplify a query. Rewrite the query.

-----

## 10. Constraints

- NEVER allow a registration to be created beyond capacity without `waitlist_enabled = true`.
- NEVER calculate pricing client-side — server action or Route Handler only.
- NEVER allow a `draft` event to appear on any public route.
- NEVER process a Stripe webhook without validating `stripe-signature`.
- NEVER promote a waitlisted registration without first confirming a slot is available.
- NEVER snapshot a price that wasn’t resolved by the server-side pricing logic in § 4.