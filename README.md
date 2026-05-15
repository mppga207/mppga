# MPPGA — Maine Professional Pet Groomers Association

Custom membership platform for the Maine Professional Pet Groomers Association
(501(c)(6) nonprofit trade association).

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4
- Supabase (PostgreSQL + PostGIS, Auth, Storage)
- Stripe (Billing + Checkout)
- Resend (transactional email)
- pnpm — the only supported package manager

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in values
pnpm dev
```

App runs at http://localhost:3000.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm test:rls` | Supabase RLS policy tests (stub until schema exists) |

## Spec of record

`CLAUDE.md` is the authoritative project specification — read it before
contributing. Subsystem rules live under `.claude/rules/`.
