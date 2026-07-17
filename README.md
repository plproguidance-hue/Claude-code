# ProGuidance Portal

USA-only client & operations portal for **ProGuidance Tech Solution**
(*Launch. Scale. Succeed.*). Phase 1 delivers the production foundation:
identity, four-role authorization, granular permissions, multi-tenant
organizations with Row Level Security, pending-registration approval, and the
responsive application shell. The authoritative specification lives in
[`docs/spec/master-build-prompt.md`](docs/spec/master-build-prompt.md); the
phase roadmap in [`docs/06-implementation-plan.md`](docs/06-implementation-plan.md).

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS v4 · Supabase
(PostgreSQL + Auth + private Storage) · Zod · Vitest · pg (integration tests).

## Getting started

```sh
npm install
cp .env.example .env.local      # fill in Supabase values

# Local Supabase (requires Docker) — see supabase/README.md
supabase start
supabase db reset               # migrations + sanitized dev seed

npm run dev                     # http://localhost:3000
```

Demo logins after seeding: `admin@proguidance.dev`,
`manager@proguidance.dev`, `moderator@proguidance.dev`,
`client.alpha@proguidance.dev`, `client.beta@proguidance.dev`,
`pending.client@proguidance.dev` — password `ProGuidance-Dev-2026!`.

## Quality gates

```sh
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # eslint (next/core-web-vitals + next/typescript)
npm run test:unit        # vitest — permission framework, brand, env, SQL/TS sync
npm run test:integration # vitest + PostgreSQL — RLS cross-tenant denial proofs
npm run build            # next build
```

Integration tests need any PostgreSQL 14+ superuser connection
(`TEST_DATABASE_URL`, default `postgres://postgres:postgres@127.0.0.1:5432/postgres`);
they create a throwaway `proguidance_test` database, apply a Supabase-compat
shim plus the real migrations, and prove that one organization can never read
or mutate another organization's records.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/app` | App Router routes: `(auth)` lifecycle pages, `(app)` protected shell, `auth/*` handlers |
| `src/config/brand.ts` | Typed ProGuidance brand/company configuration (single source) |
| `src/lib/auth/permissions.ts` | Typed role/permission framework (mirrors the database matrix) |
| `src/lib/supabase` | Browser/server/middleware/admin Supabase clients |
| `supabase/migrations` | Schema, RLS policies, permission seed |
| `tests` | Unit + integration (RLS) suites |
| `docs` | Spec, inventory, migration assessment, route matrix, data model, permission matrix, phase plan |
| `legacy/dragon-demo` | Pre-portal repository contents, archived untouched |

## Security model (Phase 1)

Default-deny RLS on every table; tenancy via `can_access_org()` (members,
assigned staff, administrators); granular permissions via `has_permission()`
with audited per-user overrides; account lifecycle (`pending_approval` →
`active`/`rejected`) enforced in the database so unapproved accounts hold a
session but reach no data; append-only `audit_logs`; service-role key confined
to a `server-only` module and unused by Phase 1 runtime flows.
