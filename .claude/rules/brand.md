# MPPGA Brand — Colors, Typography, Logo, Tone

Read this before generating any public-facing UI, email template, or member-facing copy.

-----

## 1. Color Tokens

All tokens defined in `app/globals.css` under the `mppga-` namespace. Never use raw hex in components.

**Teal (brand primary):**

|Token              |Hex      |Usage                                           |
|-------------------|---------|------------------------------------------------|
|`mppga-teal`       |`#477376`|Primary CTAs, active states, links, accents     |
|`mppga-teal-hover` |`#3a5f62`|Hover state for teal elements                   |
|`mppga-teal-deep`  |`#2C4A4D`|Dark teal, high-contrast moments                |
|`mppga-teal-darker`|`#1F3537`|Footer backgrounds, deep contrast               |
|`mppga-teal-tint`  |`#eef3f3`|Badge fills, subtle highlights, chip backgrounds|

**Surface:**

|Token          |Hex      |Usage                         |
|---------------|---------|------------------------------|
|`mppga-page`   |`#fafaf7`|App/page background           |
|`mppga-card`   |`#ffffff`|Card backgrounds              |
|`mppga-divider`|`#e5e5e0`|Borders, dividers, table rules|

**Ink:**

|Token            |Hex      |Usage                             |
|-----------------|---------|----------------------------------|
|`mppga-ink`      |`#1a1a1a`|Primary body text, headings       |
|`mppga-ink-soft` |`#4b4b4b`|Secondary text, descriptions      |
|`mppga-ink-muted`|`#7a7a75`|Timestamps, meta, placeholder text|

**Accent (warm, use sparingly):**

|Token            |Hex      |Usage                               |
|-----------------|---------|------------------------------------|
|`mppga-sand`     |`#F5EFE6`|Warm section backgrounds            |
|`mppga-sand-deep`|`#EBE2D2`|Deeper warm fills                   |
|`mppga-gold`     |`#C9A961`|Decorative accents only — never CTAs|
|`mppga-gold-soft`|`#E8D5A8`|Subtle gold tints                   |

-----

## 2. Typography

|Role                                    |Family    |Tailwind class|
|----------------------------------------|----------|--------------|
|Titles, large numbers, editorial moments|Fraunces  |`font-serif`  |
|Body, UI, labels, inputs                |Inter     |`font-sans`   |

Max 2 typefaces. Never introduce a third. Fraunces is for brand/editorial moments only — do not use it for body copy, form labels, or error messages.

-----

## 3. Logo

- Current state: placeholder “M” mark chip (teal-tint square). No production logo file exists yet.
- When a real logo is provided, it will live in Supabase Storage. Reference path TBD.
- Do not invent or generate a logo. Use the “M” placeholder until the client supplies an asset.
- Logo upload is managed via the Settings tab in the admin portal. See `@.claude/rules/admin-portal.md` § 6.7.

-----

## 4. Component Patterns

**Cards:** `rounded-lg border border-mppga-divider bg-mppga-card`

**Tables:**

- Header row: `bg-mppga-page`
- Row dividers: `divide-y divide-mppga-divider`
- Row hover: `hover:bg-mppga-page`

**Buttons:** Use the hand-rolled `<Button>` component in `components/mppga/ui/button.tsx`. Never create ad-hoc button styles.

- Primary: teal fill
- Secondary: teal outline
- Ghost / Inverse: see component

**Status badges:** Use `<StatusBadge>` in `components/mppga/admin/StatusBadge.tsx`. Never create custom status pills.

**Accent color rule:** `mppga-teal` is the only accent used for CTAs and interactive state. Gold tokens are decorative only. Never use gold for buttons, links, or status indicators.

-----

## 5. Tone & Copy Rules

**Public-facing (member-facing):**

- Warm, professional, plain language.
- No jargon, acronyms, or technical terms.
- Error messages must be instructional: tell the user what happened and what to do next.
  - ✅ “Your membership has expired. Click here to renew.”
  - ❌ “403: subscription_status=lapsed”
- No exclamation points in functional UI (buttons, nav, errors). Acceptable sparingly in celebratory moments (welcome email subject lines).
- Sentence case for all UI labels, headings, and button text. Never ALL CAPS except eyebrow labels.
- Eyebrow labels: `text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal` — used for section labels only, not body content.

**Admin-facing:**

- Direct and data-dense. Skip the warmth.
- Precision over readability — show exact counts, dates, and states.

**Email copy:**

- Subject lines: sentence case, no emoji.
- Body: warm and direct. Plain text fallback must always be included.
- Every email must include the org name (Maine Professional Pet Groomers Association) and contact email (`mppga207@gmail.com`) in the footer.
- Dues receipts must include the 501(c)(6) disclaimer. See `@.claude/rules/stripe-architecture.md`.

-----

## 6. What Not to Do

- Never use raw hex values in components — use tokens.
- Never introduce a third typeface.
- Never use gold tokens for interactive elements.
- Never generate or fabricate logo assets.
- Never use dark mode — this is a light-mode-only interface.
- Never use bright or saturated fills — the palette is intentionally muted.