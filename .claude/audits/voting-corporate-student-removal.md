# Audit — Voting, Corporate, Student/Apprentice Pricing

Snapshot taken 2026-05-17 against branch
`claude/audit-voting-corporate-flags-ihizM`. Use this as the punch list
for a follow-up session that strips voting language, the "Corporate"
tier label, and seeded Student/Apprentice pricing.

Line numbers are accurate at the time of snapshot; re-grep before
editing if the branch has moved.

> **Scope note.** This file lists *occurrences*. It does not prescribe
> the replacement copy or the data-model surgery. Decide those before
> opening edits — the schema columns (`voting_rights`,
> `corporate_umbrella`), the tier slug `corporate`, and the seeded
> dues amounts have downstream consumers in the Stripe price-swap
> flow (`stripe-architecture.md` §6.5) and the admin Tier
> configuration UI.

---

## 1. Voting

### 1.1 Code — UI copy

| File | Line | Snippet |
|---|---|---|
| `app/join/page.tsx` | 50 | `"No voting rights",` — Student tier benefit bullet |
| `app/join/page.tsx` | 65 | `"Voting rights in board elections",` — Professional tier benefit bullet |
| `app/join/page.tsx` | 83 | `"Voting rights for the primary contact",` — Corporate / Salon tier benefit bullet |
| `components/mppga/admin/TierConfigCard.tsx` | 119–122 | "Voting rights" benefit checkbox in the admin tier editor (`id="voting-…"`, `name="voting_rights"`, `label="Voting rights"`) |
| `lib/mppga/portal/preview.ts` | 104 | Checkout preview tier description: `"Full voting rights, directory listing, member event pricing."` |

### 1.2 Code — schema + seed

| File | Line | Snippet |
|---|---|---|
| `supabase/migrations/20260516000001_schema_extensions_and_tables.sql` | 32 | `voting_rights boolean not null default false,` — column on `public.tiers` |
| `supabase/migrations/20260516000005_seed.sql` | 20 | `voting_rights,` — column in the seed INSERT |
| `supabase/migrations/20260516000005_seed.sql` | 34 | Student description: `"…No voting rights, no directory listing; CE access only."` |
| `supabase/migrations/20260516000005_seed.sql` | 44 | Professional description: `"…Full voting rights, directory listing, full member portal."` |

### 1.3 Code — types + server actions + data layer

| File | Line | Snippet |
|---|---|---|
| `types/database.ts` | 89 | `voting_rights: boolean;` on `TiersRow` |
| `lib/admin/tiers-data.ts` | 9 | `votingRights: boolean;` on `AdminTier` |
| `lib/admin/tiers-data.ts` | 27 | `voting_rights: boolean;` on internal `TierRow` |
| `lib/admin/tiers-data.ts` | 41 | `"…voting_rights, directory_listing, corporate_umbrella…"` in the `select()` projection |
| `lib/admin/tiers-data.ts` | 68 | `votingRights: row.voting_rights,` in row mapper |
| `lib/admin/tiers-actions.ts` | 57 | `"name, description, voting_rights, directory_listing, corporate_umbrella, display_order"` in prior-state read |
| `lib/admin/tiers-actions.ts` | 65 | `voting_rights: formData.get("voting_rights") != null,` in `updateTierFieldsAction` |

### 1.4 Docs — `CLAUDE.md`

| Line | Snippet |
|---|---|
| 100 | `Student / Apprentice — Discounted. No voting rights.` |
| 101 | `Professional — Standard. Full voting rights.` |
| 129 | "Voting schema: Dual-table anonymity … legally required. Do not consolidate." (Decided section) |
| 153 | `- Voting system logic: @.claude/rules/voting.md` (nav link to a file that doesn't yet exist) |

### 1.5 Docs — `.claude/rules/`

| File | Line | Snippet |
|---|---|---|
| `.claude/rules/data-model.md` | 13 | "Deferred subsystems (voting, donations)" in file intro |
| `.claude/rules/data-model.md` | 128 | `voting_rights` field row on `tiers` table spec |
| `.claude/rules/data-model.md` | 371 | "### 4.1 Voting — shelved as a potential Phase 2+ add-on" |
| `.claude/rules/data-model.md` | 374–376 | "support voter anonymity if voting ever ships…" |
| `.claude/rules/data-model.md` | 556 | "### 5.15 Voting tables — deferred" |
| `.claude/rules/data-model.md` | 559 | "…until voting ships and `voting.md` is authored." |
| `.claude/rules/data-model.md` | 610 | `prevent_ballot_correlation` trigger row, "Deferred until voting ships." |
| `.claude/rules/data-model.md` | 650–651 | "Deferred voting tables — NOT created in initial migration…" |
| `.claude/rules/data-model.md` | 698 | Constraint #10: "NEVER skip the deferred voting tables' RLS lockdown." |
| `.claude/rules/phase-1-buildout.md` | 611 | "Donations, LMS-integrated CE, legislative tracking, and voting all live in CLAUDE.md §7 Open Architecture." |

### 1.6 Deferred-but-documented schema (voting tables)

These never made it into a migration — they're spec only — but they
live in `.claude/rules/data-model.md` §4.1 (`elections`,
`election_participants`, `election_ballots`) and §5.15 (RLS lockdown).
Both sections must come out together if voting is dropped entirely.

---

## 2. "Corporate" (not "Salon")

The current tier name is `Corporate / Salon`. Below is split into
references to the **`corporate` slug / `Corporate` label** vs.
**`Corporate / Salon` combo**, so the follow-up session can decide
whether to drop only the "Corporate" word or rename the whole tier.

### 2.1 "Corporate" alone (slug, schema column, prose)

| File | Line | Snippet |
|---|---|---|
| `components/mppga/auth/JoinForm.tsx` | 15 | `slug: "student" \| "professional" \| "corporate";` |
| `app/join/page.tsx` | 22 | `slug: "student" \| "professional" \| "corporate";` |
| `app/join/page.tsx` | 72 | `slug: "corporate",` |
| `lib/auth/actions.ts` | 9 | `const tierSlugs = ["student", "professional", "corporate"] as const;` |
| `lib/admin/preview.ts` | 17 | `const TIER_CORPORATE = "00000000-0000-0000-0000-000000010003";` |
| `lib/admin/preview.ts` | 137 | Preview contact-form message: "…Are sole-prop groomers Professional or Corporate?…" |
| `supabase/migrations/20260516000001_schema_extensions_and_tables.sql` | 34 | `corporate_umbrella boolean not null default false,` |
| `supabase/migrations/20260516000005_seed.sql` | 6 | Comment: `"…client picked for Phase 1 — Student $25, Professional $75, Corporate $200…"` |
| `supabase/migrations/20260516000005_seed.sql` | 22 | `corporate_umbrella,` in seed insert columns |
| `supabase/migrations/20260516000005_seed.sql` | 48 | `'corporate',` slug value |
| `types/database.ts` | 91 | `corporate_umbrella: boolean;` on `TiersRow` |
| `components/mppga/admin/TierConfigCard.tsx` | 131–134 | "Corporate umbrella" benefit checkbox (`id="corporate-…"`, `name="corporate_umbrella"`, label `"Corporate umbrella (covers staff under one account)"`) |
| `lib/admin/tiers-data.ts` | 11 | `corporateUmbrella: boolean;` on `AdminTier` |
| `lib/admin/tiers-data.ts` | 29 | `corporate_umbrella: boolean;` on internal `TierRow` |
| `lib/admin/tiers-data.ts` | 41 | `"…corporate_umbrella…"` in the `select()` projection |
| `lib/admin/tiers-data.ts` | 70 | `corporateUmbrella: row.corporate_umbrella,` in row mapper |
| `lib/admin/tiers-actions.ts` | 57 | `"…corporate_umbrella…"` in prior-state read |
| `lib/admin/tiers-actions.ts` | 67 | `corporate_umbrella: formData.get("corporate_umbrella") != null,` |

### 2.2 "Corporate / Salon" (the combined tier label)

| File | Line | Snippet |
|---|---|---|
| `app/join/page.tsx` | 73 | `name: "Corporate / Salon",` |
| `supabase/migrations/20260516000005_seed.sql` | 47 | `'Corporate / Salon',` tier name value |
| `lib/admin/preview.ts` | 22 | `{ id: TIER_CORPORATE, name: "Corporate / Salon" },` |
| `lib/admin/preview.ts` | 57 | `tierName: "Corporate / Salon",` |
| `lib/admin/preview.ts` | 208 | `tierName: "Corporate / Salon",` |

### 2.3 Docs — `CLAUDE.md`

| Line | Snippet |
|---|---|
| 50 | "organizations — Business entity (salon/clinic). Primary billing unit for Corporate tier." |
| 102 | "Corporate / Salon — Premium. Umbrella account. Sub-profiles for staff. Priority directory." |

### 2.4 Docs — `.claude/rules/`

| File | Line | Snippet |
|---|---|---|
| `.claude/rules/data-model.md` | 82 | "Salon, clinic, or shop. The billing unit for the Corporate / Salon tier." |
| `.claude/rules/data-model.md` | 123 | tier `name` example list `'Corporate / Salon'` |
| `.claude/rules/data-model.md` | 124 | slug example list `'corporate'` |
| `.claude/rules/data-model.md` | 130 | `corporate_umbrella` field row: "`true` for Corporate / Salon. Allows sub-profiles via `organization_id`." |
| `.claude/rules/data-model.md` | 664 | Seeding section: "Three rows in `tiers` (Student / Apprentice, Professional, Corporate / Salon)…" |
| `.claude/rules/phase-1-buildout.md` | 60 | Decision table row 2: "Tier pricing — annual_dues_cents for Student, Professional, Corporate" + "Resolved 2026-05-16: $25 / $75 / $200" |
| `.claude/rules/stripe-architecture.md` | 312 | "Admin moves a member from Professional to Corporate (or vice versa) via the Members admin tab." |

---

## 3. Student / Apprentice pricing

Anything that references the seeded $25 / 2500-cent figure, or
otherwise hardcodes / displays the Student tier's price.

### 3.1 Seed and supporting docs (the actual hardcoded $25)

| File | Line | Snippet |
|---|---|---|
| `supabase/migrations/20260516000005_seed.sql` | 5–8 | Header comment: "Tier annual_dues_cents seeded with the 'common nonprofit defaults' the client picked for Phase 1 — Student $25, Professional $75, Corporate $200." |
| `supabase/migrations/20260516000005_seed.sql` | 29 | `2500,` — `annual_dues_cents` value for the Student / Apprentice row |
| `supabase/migrations/20260516000005_seed.sql` | 34 | Student description: "Discounted tier for grooming students and apprentices. No voting rights, no directory listing; CE access only." |
| `.claude/rules/phase-1-buildout.md` | 60 | Decision table row 2: "Resolved 2026-05-16: $25 / $75 / $200 (seeded as 2500 / 7500 / 20000 cents)" |

### 3.2 Student/Apprentice tier label + benefit copy that mentions pricing

The Join page does NOT display a dollar amount; it only displays
benefits. The relevant pricing-adjacent copy is:

| File | Line | Snippet |
|---|---|---|
| `app/join/page.tsx` | 39 | `name: "Student / Apprentice",` |
| `app/join/page.tsx` | 42 | `tagline: "Learning the craft."` |
| `app/join/page.tsx` | 47 | `"Discounted event pricing",` — Student benefit bullet (note: this bullet also appears for Professional line 64 and Corporate line 82; if "Discounted" copy is being culled, scrub all three) |
| `app/join/page.tsx` | 140–143 | Section copy: "Annual dues are reviewed by the board each year. Final pricing will be confirmed on your application before any payment is taken." |

### 3.3 Student-tier price surfaced by the runtime UI

These read `tiers.annual_dues_cents` from the DB rather than hardcoding
a number, but they're the surfaces where the seeded `2500` would
appear to a real user:

| File | Line | Snippet |
|---|---|---|
| `app/(portal)/dashboard/checkout/page.tsx` | 83 | `{tier ? dollars(tier.annual_dues_cents) : "-"}` — renders the dues amount for whichever tier the member chose at signup |
| `app/(portal)/dashboard/checkout/page.tsx` | 141 | `.select("name, description, annual_dues_cents, stripe_price_id")` |
| `components/mppga/admin/TierConfigCard.tsx` | 18, 29, 45, 47, 74, 179 | Admin tier editor — dollar input, confirmation prompt ("Raise / Lower {tier} dues from $X → $Y?"), display of current `annualDuesCents` |
| `lib/stripe/tier-price-update.ts` | (various) | `seedTierPrice` / `updateTierDues` consume `annual_dues_cents` and create/swap the Stripe Price object. Edits the seeded `2500` flow through here. |

### 3.4 Student-tier preview fixtures (not real data)

The admin preview cookie shows demo members on the Student tier:

| File | Line | Snippet |
|---|---|---|
| `lib/admin/preview.ts` | 16, 20, 65, 69, 70, 166 | `TIER_STUDENT` constant + demo members tagged `tierName: "Student / Apprentice"` |

### 3.5 Other "student/apprentice" mentions (not pricing — context only)

If the follow-up session is also stripping the tier entirely, also
remove:

| File | Line | Snippet |
|---|---|---|
| `components/mppga/landing/WhoWeAre.tsx` | 62 | "MPPGA brings together salon owners, mobile stylists, apprentices, educators…" |
| `components/mppga/landing/WhyJoin.tsx` | 23 | "Connecting groomers, salon owners, mobile stylists, educators, and apprentices throughout Maine…" |
| `lib/mppga/admin/landingContent.ts` | 87 | Mirror of WhoWeAre copy (admin-editable landing content) |
| `lib/mppga/admin/landingContent.ts` | 107 | Mirror of WhyJoin pillar body |
| `app/join/page.tsx` | 122–125 | Hero copy: "…professional groomers, salon owners, mobile stylists, apprentices, and educators working in Maine." |

These are general "apprentices" mentions in marketing copy, not tier
pricing. They're listed here because removing the Student/Apprentice
tier from the data model probably means rewriting these too.

---

## 4. Downstream consequences if anything here is removed

Spelled out so the next session doesn't get blindsided:

1. **Removing `voting_rights` from `tiers`** requires a new migration
   (drop the column + remove from seed + regenerate `types/database.ts`
   + delete the benefit checkbox + drop the prior-state read in
   `tiers-actions.ts`).
2. **Removing `corporate_umbrella` from `tiers`** has the same
   migration surgery as `voting_rights`, plus it removes the only
   semantic difference between the "Corporate / Salon" tier and the
   "Professional" tier — confirm the tier itself is staying before
   deleting the column.
3. **Renaming or dropping the `corporate` slug** affects:
   - `tierSlugs` literal in `lib/auth/actions.ts` (Zod enum) — every
     existing in-flight `signUp` whose `options.data.tier_slug` is
     `'corporate'` would start rejecting at the validation step.
   - `app/join/page.tsx` + `components/mppga/auth/JoinForm.tsx` TS
     unions.
   - The `'corporate'` row in `supabase/migrations/20260516000005_seed.sql`
     (a new migration must `UPDATE tiers SET slug = …` since the seed
     migration is already applied — see CLAUDE.md §9 Migration Ledger).
   - Any live `memberships` rows pointing at the renamed `tier_id` are
     fine (FK is on `tier_id`, not slug), but the dashboard checkout
     page's tier lookup is by slug? No — it joins on `tier_id` via the
     membership row, so safe.
4. **Removing the seeded Student $25 / Corporate $200 amounts**
   requires either (a) editing the seed migration before its applied
   to a fresh environment AND writing an `UPDATE tiers …` migration
   for environments where it has already run, or (b) re-seeding
   `annual_dues_cents = 0` and forcing the admin to set the real
   amount via Settings → Tier configuration (which goes through the
   `seedTierPrice` bootstrap path in `lib/stripe/tier-price-update.ts`).
5. **Dropping voting from the rules docs** means removing CLAUDE.md
   §10 constraint #3 ("NEVER add a user_id FK to election_ballots")
   too — currently this constraint will block anyone who later wants
   to add a join table that happens to involve ballots, even
   incidentally.

---

## 5. Grep commands used (for re-verification)

```bash
# Voting (filters out false positives from "devoted", "professional"):
grep -rni "voting\|\bvote\b\|ballot\|election" \
  --include="*.ts" --include="*.tsx" --include="*.sql" \
  --include="*.md" --include="*.json" .

# Corporate:
grep -rni "corporate" \
  --include="*.ts" --include="*.tsx" --include="*.sql" \
  --include="*.md" --include="*.json" .

# Student / Apprentice:
grep -rni "student\|apprentice" \
  --include="*.ts" --include="*.tsx" --include="*.sql" \
  --include="*.md" --include="*.json" .
```

Re-run before editing — the branch may have moved.
