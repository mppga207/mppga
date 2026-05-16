# MPPGA Auth & Middleware — Sessions, Claims, Route Protection

Read this before touching any auth flow, `middleware.ts`, server-side
session helper, or route under `/admin`, `/dashboard`, `/sign-in`,
or `/renew`.

This file defines:

1. Identity model and session storage
2. JWT custom claims (`role`, `membership_status`) and how they get
   into the token
3. Route protection matrix
4. Server-side helpers and how every route gets the right session
5. Sign-up, sign-in, sign-out, and renewal redirect flows
6. Hard constraints

Companion specs:

- `@.claude/rules/data-model.md` — the `profiles` and `memberships`
  tables that back every claim
- `@.claude/rules/stripe-architecture.md` — webhook handlers that
  flip `memberships.status` (and therefore the claim)
- `@.claude/rules/admin-portal.md` — what the admin role unlocks
- `@.claude/rules/email-automation.md` — magic-link template

-----

## 1. Identity model

- **Supabase Auth** is the only identity provider. Never propose
  NextAuth, Clerk, or any alternative (CLAUDE.md §7).
- **Magic-link** is the default sign-in. No passwords, no social
  providers. Confirmed with the client per `admin-portal.md` §8.
- Each `auth.users` row has exactly one `public.profiles` row,
  created by the `create_profile_on_signup` trigger
  (`data-model.md` §7).
- Each profile has exactly zero or one `public.memberships` row.
  Sign-up creates the profile; the join flow creates the membership.

There is no separate "user" vs. "profile" concept in the UI —
everywhere outside of auth internals, "the user" means the
`profiles` row.

-----

## 2. JWT custom claims

Two custom claims live on every authenticated JWT. Both are required
by the rest of the system; never read role or status from anywhere
else.

| Claim | Type | Source | Used by |
|---|---|---|---|
| `role` | `'member' \| 'admin'` | `profiles.role` | Admin gate, RLS admin check |
| `membership_status` | `membership_status` enum | `memberships.status` | Middleware redirects, RLS on member-scoped tables |

A third claim — `email` — is set by Supabase Auth itself; don't
duplicate it.

### 2.1 The auth hook

Supabase Auth's custom-claims hook is wired to a Postgres function:

```
public.handle_auth_jwt_claims(event jsonb) returns jsonb
```

The function reads `profiles.role` and `memberships.status` for the
authenticating user and merges them into the JWT under the keys
above. It must:

- Read with the service role's privileges (SECURITY DEFINER, search
  path locked to `public`).
- Return `'member'` / `'Awaiting_Payment'` defaults if the profile
  or membership row hasn't been written yet (race condition during
  signup).
- Never raise. A raised exception breaks login. On any internal
  error, return the input event unchanged so login succeeds with
  default claims and the middleware handles the redirect.

The hook is configured per environment via the Supabase dashboard.
Production and staging hook bindings live in the project's deploy
runbook — not in this repo.

### 2.2 Claim freshness

JWTs are issued at sign-in and refreshed roughly every hour by
`@supabase/ssr`. Status changes via the `membership-status-sync`
Edge Function (CLAUDE.md §4) take effect on the user's next token
refresh — typically within 60 minutes.

For critical transitions (renewal payment succeeds, admin moves a
member to `Suspended`), the Edge Function calls
`auth.admin.signOut(user_id, { scope: 'others' })` after the
membership write. The user's next request from any device produces a
fresh token with the new claim. Their current device keeps its
existing token until the natural refresh — that's acceptable for the
read-only `Grace_Period` window, and good enough for everything
else.

Never short-circuit claim freshness by reading `memberships.status`
in middleware. The whole point of the claim is to keep middleware
queries to zero. Use the claim; the Edge Function's job is to keep
it honest.

-----

## 3. Route protection matrix

Middleware runs for every request matched by the matcher in
`middleware.ts`. The matcher excludes static assets; everything else
flows through `updateSession` (§ 5).

| Path prefix | Required identity | Required status | Otherwise → |
|---|---|---|---|
| `/` | none | — | render |
| `/about`, `/contact`, `/join` | none | — | render |
| `/events`, `/events/[id]` | none | — | render (only `published` events visible via RLS) |
| `/events/[id]/confirmation` | authenticated | any | render (404 if no matching registration) |
| `/sign-in` | none | — | render. If already signed in, redirect to `/dashboard`. |
| `/renew` | authenticated | any | render |
| `/dashboard`, `/dashboard/*` | authenticated | `Active` / `Honorary` / `Grace_Period` | see § 3.1 |
| `/admin`, `/admin/*` | authenticated | any | `role === 'admin'` required; otherwise redirect to `/dashboard` |
| `/api/webhooks/*` | none (signature-verified) | — | route handler validates; middleware does NOT auth-gate webhooks |
| `/api/auth/*` | varies | — | route handler decides |

### 3.1 Dashboard status branching

Inside `/dashboard/*`, the middleware uses `membership_status` to
shape access:

| Status | Behavior |
|---|---|
| `Active` | full access |
| `Honorary` | full access |
| `Grace_Period` | full access; pages render the renewal banner from `CLAUDE.md` §4 |
| `Lapsed` | redirect to `/renew` (CLAUDE.md constraint #7 — never 403) |
| `Suspended` | redirect to `/renew` with a `?reason=suspended` query; the page surfaces an admin-contact message |
| `Awaiting_Payment` | redirect to `/dashboard/checkout` (single page that hosts the Stripe Checkout link) |

A non-admin authenticated user trying to access `/admin/*` is
redirected to `/dashboard`, then re-evaluated by the table above.
Never return a generic 403 to a non-admin (CLAUDE.md §10 #7 covers
lapsed; we're extending the same instinct here — instructional, not
HTTP-numeric).

### 3.2 Public routes referencing protected data

`/events/[id]/confirmation` reads the requester's
`event_registrations` row. If the requester isn't signed in or
doesn't own the registration, render a 404 (not 403) — the existence
of a registration is itself member data.

-----

## 4. Server-side helpers

All helpers live under `lib/supabase/`. The browser client at
`lib/supabase/client.ts` is for client components only and never
trusted for authorization decisions.

### 4.1 `createClient()` — server-side, request-scoped

Already present at `lib/supabase/server.ts`. Reads/writes the
session via the Next cookie store. Use in server components, route
handlers, and server actions. RLS applies — this is the user-scoped
client.

### 4.2 `createServiceRoleClient()` — privileged, server-only

Already present. Bypasses RLS. Use ONLY for:

- Stripe webhook handlers
- `membership-status-sync` Edge Function callers
- Internal cron jobs
- The auth hook (which already runs as service role inside Postgres)

Never invoke from a route reachable by an unauthenticated request
without a prior signature/secret check. Calling this client is a
red flag in code review — every call site needs a one-line comment
explaining why RLS can't carry the request.

### 4.3 `getSession()` and `requireSession()`

To be added at `lib/supabase/session.ts`:

```ts
getSession(): Promise<Session | null>
requireSession(): Promise<Session>            // redirects to /sign-in
requireAdmin(): Promise<Session>              // redirects to /dashboard if non-admin
requireMember(): Promise<Session>             // redirects per § 3.1
```

Each helper uses the server client and returns the JWT-derived
session, including custom claims under `session.user.app_metadata`.
Helpers redirect via `next/navigation`'s `redirect()` — never throw
custom 401/403s.

### 4.4 Reading claims

Once a session exists, read claims off `app_metadata`:

```ts
const role = session.user.app_metadata.role as ProfileRole;
const status = session.user.app_metadata.membership_status as MembershipStatus;
```

Never read `user_metadata` for authorization — that field is
user-writable. Always `app_metadata`.

-----

## 5. Middleware logic

`middleware.ts` is the only place where every request runs through
auth code. Keep it focused: refresh the session, decide the
redirect, hand off.

`lib/supabase/middleware.ts` exports `updateSession(request)`, which:

1. Builds the Supabase server client against the incoming request's
   cookies.
2. Calls `supabase.auth.getUser()` — this refreshes the access
   token cookie if it's near expiry, no-op otherwise. Use
   `getUser()`, never `getSession()`, in middleware (the former
   re-verifies against Supabase; the latter trusts the cookie).
3. Reads `app_metadata.role` and `app_metadata.membership_status`
   from the user.
4. Applies the matrix from § 3 and either calls
   `NextResponse.next()` (with the refreshed cookies) or
   `NextResponse.redirect()`.
5. Returns the response with the cookies set so the new token
   reaches the downstream server components.

Constraints on the middleware:

- NEVER fetch from the database directly. Read everything off the
  JWT.
- NEVER mutate `memberships` or `profiles`. Read-only.
- NEVER log full JWTs or cookie values.
- Keep the matcher lean — see § 7. Every additional matched path is
  a token refresh on every request.

-----

## 6. Sign-up, sign-in, sign-out

### 6.1 Sign-up

The join flow at `/join`:

1. Member enters email + name + tier selection on the marketing
   page.
2. Server action calls `supabase.auth.signInWithOtp()` to send a
   magic link. The tier slug travels in `options.data.tier_slug`
   so the auth callback can finish setup. (`shouldCreateUser: true`
   — the default.)
3. `auth.users` row created on first link click. The
   `create_profile_on_signup` trigger inserts `profiles` with
   `role = 'member'` (see `data-model.md` §7).
4. The `/auth/callback` route exchanges the code, reads
   `user_metadata.tier_slug`, and inserts the `memberships` row
   with `tier_id` resolved against `tiers.slug` and
   `status = 'Awaiting_Payment'` via the service-role client
   (`data-model.md` §5.4 RLS). The insert is idempotent on
   `profile_id`.
5. Member lands on `/dashboard/checkout` (middleware redirects
   anything else in `/dashboard/*` while status is
   `Awaiting_Payment`). The page hosts the Stripe Checkout link.
6. Successful payment moves status to `Active` via the Stripe
   webhook — there is no board-review step.

The `Awaiting_Payment` redirect in § 3.1 keeps newly-signed-up
members on the payment page until dues clear.

### 6.2 Sign-in

`/sign-in`:

1. Email input → server action → `signInWithOtp()`.
2. Email arrives via Resend (template key TBD in
   `email-automation.md`). The redirect URL embedded in the link
   points at `/auth/callback?next=<original>`.
3. `/auth/callback/route.ts` exchanges the code for a session
   (`supabase.auth.exchangeCodeForSession`) and writes the cookies,
   then redirects to `next` (default `/dashboard`).
4. Middleware on the next request reads the cookies, refreshes the
   token if needed, and applies the matrix.

Sign-in is idempotent — a successful sign-in over an existing
session is a no-op token refresh.

### 6.3 Sign-out

A single server action at `lib/auth/sign-out.ts` (TBD) calls
`supabase.auth.signOut()` and redirects to `/`. Both admin and
member sign-out land at `/`. Never redirect to a deep link the user
just lost access to.

-----

## 7. Middleware matcher

```ts
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
]
```

This is already in `middleware.ts`. The matcher excludes static
assets only — every dynamic route runs through `updateSession`.

Reasons not to narrow the matcher further:

- The session cookie refresh has to happen on every request that
  could read or write user-scoped data. Narrowing the matcher
  introduces stale-cookie edge cases.
- The redirect logic is centralized; narrowing it forces per-route
  duplication.

Reasons to expand the matcher (none currently apply): if a future
non-_next/static asset path needed session-aware caching headers.

-----

## 8. Cookies & security

- Supabase Auth uses `sb-<project_ref>-auth-token` (split across
  numbered cookies for size). Don't read these directly — use the
  `@supabase/ssr` client.
- All cookies are HTTP-only, `SameSite=Lax`, `Secure` in production.
  `@supabase/ssr` sets these correctly by default; don't override.
- CSRF: server actions are protected by Next's built-in
  origin check. Route handlers that accept POST must validate the
  session before any side effect — never trust `Origin` alone.
- Logging: middleware logs URL + status code only. Never the token,
  never the email, never the cookie value. The Vercel access log
  already captures URL + status; this means application-level auth
  logs are typically empty, which is the goal.

-----

## 9. Edge cases

### 9.1 Trigger race during sign-up

If a user clicks the magic link faster than the
`create_profile_on_signup` trigger fires (rare but possible), the
auth hook returns default claims (`role = 'member'`,
`membership_status = 'Awaiting_Payment'`) and middleware sends them
to `/dashboard/checkout`. The callback's idempotent membership
insert catches up on the next request once the trigger runs. No
error to the user.

### 9.2 Admin demoted mid-session

An admin role is revoked by another admin via the board roster
(admin-portal.md §6.6). The change writes `profiles.role = 'member'`
and the server action then calls
`auth.admin.signOut(targetUserId, { scope: 'others' })`. The
demoted admin's current tab keeps `role = 'admin'` claims until the
next token refresh (≤1 hour). RLS still enforces correctness at the
database — the UI may briefly show admin chrome to a non-admin, but
no admin-only mutation will succeed. Acceptable.

### 9.3 Session in two tabs, status flips in one

Member pays in tab A — webhook flips status to `Active`. Tab B
still has `Grace_Period` claims for up to an hour. Tab B sees
read-only UI; on any mutation attempt, server actions re-read the
membership via the user-scoped client (RLS), find `Active`, and
allow the write. The UI's status chrome catches up on next
navigation.

-----

## 10. Constraints — MUST ADHERE

1. NEVER read `profiles.role` or `memberships.status` in middleware.
   Read the JWT claims.
2. NEVER write `memberships.status` from middleware or server
   actions. The `membership-status-sync` Edge Function or the
   Stripe webhook are the only writers (CLAUDE.md §10 #2 and #11).
3. NEVER return a generic 403 to a member. Redirect to `/renew`,
   `/sign-in`, or `/dashboard` per § 3 (CLAUDE.md §10 #7).
4. NEVER trust `user_metadata` for authorization. Always
   `app_metadata`.
5. NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to the client. The
   service-role client is server-only (CLAUDE.md §10 #14).
6. NEVER call `createServiceRoleClient()` in response to an
   unauthenticated request without a prior signature / shared-secret
   check.
7. NEVER skip `updateSession` in middleware for protected routes.
   The cookie refresh is what keeps the session alive.
8. NEVER log the JWT, the session cookie, or the user's email.
9. NEVER add a sign-in method without explicit instruction. Magic
   link is the only flow.
10. NEVER let a non-admin see any admin chrome long enough to click
    it — the matrix in § 3 always wins over any conditional render
    inside an admin page.
