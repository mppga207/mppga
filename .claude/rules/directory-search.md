# MPPGA Directory & Search — PostGIS Queries, Privacy, Geocoding

Read this before touching the public directory route, the
`/dashboard/directory` member-facing editor, any query against
`directory_listings`, or anything that handles a member's address.

This file defines:

1. What the public directory is and where it lives
2. The query model — radius, city, specialty filters via PostGIS
3. Privacy: the `show_*` flags, the masked view, what anon sees
4. Geocoding — when and how an address becomes a `geography(Point)`
5. The member-facing editor flow
6. RLS, indexes, and constraints

Companion specs:

- `@.claude/rules/data-model.md` — the `directory_listings` table
  schema and RLS policies
- `@.claude/rules/auth-middleware.md` — the gate between anon and
  authenticated reads
- `@.claude/rules/brand.md` — UI tone for the public directory

-----

## 1. Scope

The directory is the public face of MPPGA membership. Pet owners
across Maine use it to find a groomer near them. It is the single
biggest member-benefit lever the directory listing checkbox on
`tiers` controls.

### 1.1 Where it lives

| Surface | Route | Audience |
|---|---|---|
| Public directory | `/directory` | anon + authenticated |
| Map + list views | `/directory?view=map` (TBD) | anon + authenticated |
| Member detail | `/directory/[profile_id]` | anon + authenticated (gated by `is_visible`) |
| Member editor | `/dashboard/directory` | authenticated owner |
| Admin override | `/admin/members/[id]` "Organization" tab | admin |

The public routes under `/directory` are NOT yet built — they're on
the punch list. Build them against this spec.

### 1.2 What a listing represents

One `directory_listings` row per profile (`data-model.md` §3.5).
Sole proprietors and salon owners alike — the row carries the
display name (defaulting to the profile or organization name), a
city/state, a PostGIS point, and the visibility flags that decide
which contact channels appear.

A listing is automatically hidden when its owner's membership
leaves `Active` or `Honorary` (`directory_listings.is_visible`
flips to `false`). The flip is performed by the
`membership-status-sync` Edge Function — the table itself never
joins to `memberships` at query time.

-----

## 2. Query model

Every directory query funnels through a single server-side helper
(`lib/directory/search.ts`, TBD). The helper:

1. Reads the user-scoped Supabase client.
2. Builds a query against the masked view (§ 3.2).
3. Applies filters (city, specialty, radius).
4. Sorts by distance when a center point is provided, otherwise by
   display name.
5. Returns a strongly-typed result set.

Never run the query from a client component. The masking logic in
§ 3 depends on the server doing the projection.

### 2.1 Radius search

PostGIS `geography(Point, 4326)` columns support distance in meters
out of the box. The canonical radius query:

```sql
select
  id,
  display_name,
  city,
  state,
  specialties,
  business_phone,    -- only the columns the masked view exposes
  public_email,
  ST_Distance(location, $1::geography) as distance_meters
from directory_listings_public
where is_visible = true
  and ST_DWithin(location, $1::geography, $2::float8)
order by distance_meters asc
limit 50;
```

- `$1` is the search center (a `geography(Point, 4326)`).
- `$2` is the radius in meters (Maine UX: default 50 mi → 80,467 m).
- `ST_DWithin` is the index-using predicate. Never use
  `ST_Distance(...) < x` as a filter — it scans every row.
- The GIST index on `location` (`data-model.md` §6) is what makes
  this O(log n).

### 2.2 City and specialty filters

Both are optional on top of (or instead of) the radius:

- `city ILIKE $3` — uses the city b-tree index. Match exact city
  names from the dropdown, never free-text city strings (those go
  through the geocoder, § 4).
- `specialties && $4::text[]` — array overlap, uses the GIN index
  (`data-model.md` §6). Pass an array of selected specialty tags.

Combining filters: `AND` them. There's no fuzzy ranking — listings
that match all filters appear; everything else doesn't. We're not
building search relevance, we're building a filtered list.

### 2.3 Result pagination

`limit + offset` with a hard cap of 50 results per page. The
directory is small enough (Maine, a few hundred groomers at full
membership) that infinite scroll isn't worth the complexity. A
single "Next" button per page is enough.

-----

## 3. Privacy & masking

Per CLAUDE.md constraint #9, personal mobile and address default to
`show_* = false`. The directory must never leak a field whose
`show_*` flag is `false`, even to other authenticated members.

### 3.1 The four toggles

| Toggle | Default | What it gates |
|---|---|---|
| `show_business_phone` | `true` | `business_phone` |
| `show_personal_mobile` | `false` | `personal_mobile` |
| `show_address` | `false` | `address_line` (street). City + state are always shown. |
| `show_public_email` | `true` | `public_email` |

The four toggles are independent. A listing can show its email but
hide its phone, or vice versa.

### 3.2 The masked view

Public reads go through a database view, not directly against the
table:

```sql
create view directory_listings_public as
select
  id,
  profile_id,
  display_name,
  bio,
  city,
  state,
  location,
  specialties,
  is_visible,
  case when show_business_phone  then business_phone  end as business_phone,
  case when show_personal_mobile then personal_mobile end as personal_mobile,
  case when show_address         then address_line    end as address_line,
  case when show_public_email    then public_email    end as public_email
from directory_listings
where is_visible = true;
```

Two reasons for the view:

1. **Defense in depth.** RLS prevents anon from reading
   hidden-listing rows, but the column-level masking is enforced by
   the view itself. A future query that forgets to project carefully
   still can't return a `null` masked column — it's `null` by
   construction.
2. **Single source of truth.** Every consumer (the radius query, the
   detail page, the API helper) hits the view. Adding a future
   toggle (say, `show_socials`) is a one-line view change, not a
   sweep across every query.

The owner reading their own listing in `/dashboard/directory` uses
the base table directly via the user-scoped client — they see
their full row (RLS allows it) and toggle the flags.

### 3.3 RLS for anon

`data-model.md` §5.5 grants anon SELECT on
`directory_listings WHERE is_visible = true`. The view inherits
that policy. Two important consequences:

- Anon never sees the table at all if `is_visible = false`.
  Suspended, Lapsed, and Pending_Approval members are silently
  absent from search results, not visible-but-empty.
- Anon never sees the toggle flags themselves — they're not in the
  view. There's no signal that a particular member chose to hide
  their phone vs. just hasn't entered one.

### 3.4 What the public detail page renders

`/directory/[profile_id]`:

| Field | Source | Notes |
|---|---|---|
| Display name | `display_name` | Falls back to organization or profile name in the application layer, but the view stores the resolved value |
| Bio | `bio` | Markdown not allowed for v1 — plain text only |
| City / state | `city`, `state` | Always shown |
| Specialties | `specialties` | Chip list |
| Address | `address_line` (if visible) | Only when `show_address = true`; never the geographic point itself |
| Phone | `business_phone` (if visible) | `tel:` link |
| Email | `public_email` (if visible) | `mailto:` link with `nofollow` on the page |
| Personal mobile | `personal_mobile` (if visible) | `tel:` link |
| Map pin | derived from `location` | Approximate — see § 3.5 |

### 3.5 Map precision

When we render a map (Mapbox / Maplibre — TBD, treat as
unspecified), the pin uses the raw `location`. That's the same
point used for distance calculations and is precise enough to land
on the right block.

We do NOT publish a separate coarser "neighborhood-only" coordinate
in the view. The address line is the only thing controlled by the
toggle; the point itself is needed for radius search, and a member
who wanted to hide their precise location would set
`is_visible = false` entirely rather than try to fuzz coordinates.

If we ever offer "show city only, no map pin" as a future toggle,
add `show_pin_on_map` and have the view emit `null` for `location`
when it's off. Don't do this preemptively.

-----

## 4. Geocoding

A member enters a street address. The system needs a
`geography(Point, 4326)` for the radius search. Geocoding happens
server-side, on save.

### 4.1 Provider

TBD. Candidates: Mapbox Geocoding, Google Geocoding, Nominatim
(OpenStreetMap). Pick one before building. The choice is closed by
this doc when it ships:

- Cost — Mapbox and Google bill per request; Nominatim is free
  with attribution + rate limits.
- Accuracy on Maine rural addresses — Mapbox and Google are strong;
  Nominatim varies.
- Rate limits — Nominatim is 1 req/sec per IP; the others are far
  higher.

For development, hardcode a Brunswick or Portland point to avoid
hammering the API.

### 4.2 Flow

When a member submits an address change:

1. Server action receives `{ address_line, city, state }`.
2. Server calls the geocoder with the concatenated address.
3. Geocoder returns `(lat, lng)` and a normalized address.
4. Server writes `directory_listings.location =
   ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` and
   `address_line` to the normalized value.
5. Geocoded result is cached (TBD: a small `geocoder_cache` table
   keyed on the input string) so re-saves don't re-bill.

Note the argument order: `ST_MakePoint(longitude, latitude)`.
Mixing them is the #1 PostGIS bug and produces points in the
Atlantic or Antarctica.

### 4.3 What if geocoding fails

Two failure modes:

- **Invalid address** (geocoder returns no result) — server
  rejects the form save, surfaces "We couldn't find that address.
  Double-check the street and city."
- **Geocoder unavailable** (API down, rate-limited) — server keeps
  the previous `location` if there was one; surfaces "Address
  couldn't be verified right now. Try again in a few minutes." Do
  NOT silently save without a point — the listing would disappear
  from radius search until somebody noticed.

### 4.4 The center point for search

The public directory's center point comes from the searcher, not
the listing. Two ways to get it:

1. **Browser geolocation** — `navigator.geolocation.getCurrentPosition`
   with user consent. Falls back to # 2 on denial.
2. **Address / ZIP input** — the searcher types in a town or ZIP;
   server geocodes it the same way as a member's address.

Never store a searcher's coordinate. The center is request-scoped.

-----

## 5. The member-facing editor

`/dashboard/directory` (already exists as a shell). When wiring up:

### 5.1 What's editable

| Field | Editable | Notes |
|---|---|---|
| `display_name` | yes | Defaults to org name or profile full name |
| `bio` | yes | Plain text, ~500 char soft cap |
| `address_line`, `city`, `state` | yes | Triggers a re-geocode on save (§ 4.2) |
| `business_phone`, `personal_mobile`, `public_email` | yes | Just text fields; format validation server-side |
| `specialties` | yes | Multi-select against an admin-managed taxonomy (TBD: where the taxonomy lives — a `specialties` table or a static list in code) |
| `show_*` flags | yes | Toggles |
| `is_visible` | yes (master switch) | "Pause my listing" — admin can override |

### 5.2 What's not editable

- `id`, `profile_id`, `created_at`, `updated_at` — system-managed.
- `location` — derived from address, never set directly. If a
  member wants to correct it, they correct their address.

### 5.3 Validation

- Display name: 1–80 chars, no URLs or emojis.
- Phone fields: server normalizes to `+1 XXX XXX XXXX` on save.
  Reject anything that doesn't have ≥10 digits after stripping
  non-digits. We're not internationalizing — Maine groomers, US
  phone numbers.
- Email: standard email regex, then a server-side MX lookup if we
  want to be strict (probably yes — the field is public-facing).
- Bio: strip HTML tags server-side, store as plain text.

### 5.4 Toggling personal-mobile / address visibility

When a member flips `show_personal_mobile` or `show_address` to
`true`, the form surfaces a confirmation: "This will be visible to
anyone who finds your listing. Continue?". CLAUDE.md constraint #9
defaults these to off — the prompt makes the act of turning them on
deliberate.

No prompt when flipping back to `false`.

-----

## 6. Performance

Indexes already exist per `data-model.md` §6. To restate the ones
that matter here:

| Index | Why it matters |
|---|---|
| GIST on `location` | The radius query in § 2.1 is O(log n) instead of O(n) |
| b-tree on `city` | The city filter; also the `ILIKE` against an indexed text column needs the right operator class for case-insensitive search — see § 6.1 |
| GIN on `specialties` | The `&&` overlap operator hits the GIN index |
| UNIQUE on `profile_id` | One listing per profile |

The masked view doesn't add overhead — Postgres folds it into the
query plan against the base table.

### 6.1 ILIKE on city

`city ILIKE 'portland%'` is a sequential scan against the b-tree
unless we use `text_pattern_ops` or `citext`. Two options:

1. **`citext`** column for `city` — `data-model.md` §8 lists the
   extension. Plain `=` becomes case-insensitive and uses the
   b-tree.
2. **Restrict to exact match** — the directory UI uses a dropdown
   of distinct cities, so `=` is enough and `citext` is overkill.

Default to option 2 unless we discover users need fuzzy city
matching.

### 6.2 Query budget

Public directory queries should return in <100ms p95 against the
expected dataset size (≤500 listings statewide). If a query
starts hitting that ceiling, the first move is `EXPLAIN ANALYZE`,
not "add more indexes."

-----

## 7. Admin overrides

Admin can edit any field on any listing from the Members admin tab
(`admin-portal.md` §5). Two scenarios:

- **Cleanup** — a member's display name is off-brand, their bio
  has a typo, etc. Admin edits directly; logged in
  `admin_action_log` with `action = 'profile_edit'`.
- **Forced hide** — a complaint comes in, admin sets
  `is_visible = false`. Logged with a payload note. The member
  retains the row but their listing disappears from search.
  Restoring visibility requires another admin action.

Never automate visibility changes based on complaints. There is no
report-this-listing flow; complaints come through email to the
board.

-----

## 8. Constraints — MUST ADHERE

1. NEVER query `directory_listings` directly from the client. All
   queries go through the server, against the masked view.
2. NEVER bypass the masked view for public reads. Adding a new
   public consumer means adding it as a column on the view, not
   as a join against the base table.
3. NEVER store a searcher's geolocation. The center point is
   request-scoped and discarded after the response.
4. NEVER swap longitude and latitude in `ST_MakePoint(lng, lat)`.
   It silently produces nonsense coordinates.
5. NEVER substitute lat/lng pairs for the PostGIS `geography`
   column (CLAUDE.md constraint #8 in `data-model.md` §11).
6. NEVER default `show_personal_mobile` or `show_address` to
   `true` (CLAUDE.md constraint #9). The member chooses, every
   time.
7. NEVER skip geocoding on address save. The listing must always
   have a valid `location` or the radius search silently drops it.
8. NEVER save an unverified address silently. If geocoding fails,
   tell the user and reject the save.
9. NEVER expose a `show_*` flag's value to anon. The masked view
   doesn't project it; nothing else should either.
10. NEVER write `is_visible = true` for a profile whose membership
    is not `Active` or `Honorary`. The
    `membership-status-sync` Edge Function owns that flip.
11. NEVER hardcode the specialty taxonomy in two places. One source
    of truth — either a `specialties` table or a single config
    file. Decide before building.
12. NEVER paginate the directory below 20 per page or above 50 per
    page without a UX reason. The dataset is small; more pages is
    more friction.
