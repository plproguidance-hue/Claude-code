# Migration Assessment

## Summary

There is no previous portal codebase in this repository to migrate (see
`docs/01-existing-project-inventory.md`). The only pre-existing project is an unrelated canvas
animation demo. The "migration" is therefore **archive-and-rebuild**:

1. The pre-existing project is preserved byte-for-byte in `legacy/dragon-demo/` and on the
   `backup/pre-portal-dragon-demo` branch.
2. The portal is implemented clean on Next.js App Router per spec §9, which is also what the spec
   mandates even when a Vite prototype exists ("Do not directly port or preserve the old `.jsx`,
   Vite, or React Router framework files").

## Decision log

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Archive dragon demo to `legacy/dragon-demo/` instead of deleting | Spec §12: "Keep the old project available for comparison." Zero risk: files are inert (no build hooks). |
| 2 | Scaffold Next.js at repository root (not a subdirectory) | Single-app repository; simplest deploy story (Vercel/container builds from root). |
| 3 | Brand data hardcoded nowhere except `src/config/brand.ts` | Spec §2 requires a single typed configuration source; database-backed overrides come with `system_settings` (admin settings UI in a later phase). |
| 4 | Placeholder logo asset, real logo pending | `src/assets/logo.png` was not supplied in the workspace. The spec forbids redrawing/replacing the real wordmark, so a *labelled placeholder* + documented drop-in path is the only honest option. **Waiting on owner upload.** |
| 5 | Supabase local dev via CLI config; RLS tests via local PostgreSQL 16 with an `auth.*` shim | Docker is unavailable in the build container, so `supabase start` cannot be exercised here. The shim replicates `auth.users`, `auth.uid()`, `auth.jwt()`, and the `anon`/`authenticated`/`service_role` roles so the *same migration files* are executed and the RLS proofs run against a real Postgres. |
| 6 | No data migration scripts | There is no source data. Development fixtures are generated fresh and sanitized (spec §2: no prior client PII). |

## Business-logic carry-forward map

Because the prior prototype is absent, the authoritative source for each carried-forward concept is
the MASTER BUILD PROMPT itself:

| Prior capability (spec §12 list) | Carried forward via | Phase |
| --- | --- | --- |
| Logo, identity, orange/charcoal brand, tagline | `src/config/brand.ts`, Tailwind semantic tokens | **1 (done)** |
| Client/Admin/Manager/Moderator vocabulary | `app_role` enum, permission framework, RLS | **1 (done)** |
| Registration → pending → approval lifecycle | `profiles.status` + `approve_registration()` + `/pending-approval` | **1 (done)** |
| Dashboard, companies, services, projects, documents, invoices, payments, wallet, tickets, quotations, notifications, help, perks | Route matrix + data model reserved; modules built in Phases 2–7 | 2–7 |
| USD-only catalogue and seed prices | Spec §6.4 price list → catalogue seed in Phase 3 | 3 |

## Risks introduced by the missing prototype

- Any behaviour of the old portal *not* captured in the spec cannot be recovered from code. If the
  owner has the previous portal elsewhere, adding it under `legacy/previous-portal/` in any form
  would let later phases cross-check workflows.
- The real logo file is required before any public-facing deployment; the placeholder is
  intentionally conspicuous.
