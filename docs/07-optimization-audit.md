# 07 — Architecture & Optimization Audit

**Date:** 2026-09-24 · **Scope:** full repository at commit `8d97378` (Phase 8) · **Mode:** read-only review — no application code was changed.

Stack: Next.js 15.5 App Router · React 19 · Supabase (Postgres + RLS + Storage) · Tailwind 4 · Zod.

## How this audit was done

Four parallel reviews, one per layer, each required to cite `file:line` and verify against the code:

1. Database — `supabase/migrations/*.sql` (RLS, indexes, triggers, concurrency)
2. Server data fetching — `page.tsx` / `layout.tsx` / `route.ts`
3. Middleware, `src/lib/**`, server actions
4. Client components, bundle, config, repo hygiene (including a real build)

The high-severity findings were then re-checked by hand against the source.

### Baseline health (verified by running the tooling)

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean, 0 warnings |
| `npm run test:unit` | 53/53 passed |
| `npm run build` (dummy env from `.env.example`) | success, 56 routes, 0 warnings; First Load JS 102 kB shared, 103–112 kB per route (MFA pages 184–186 kB, expected) |
| Integration tests | not run (need a live Postgres) |

**Bottom line:** the codebase is well structured and correct at small scale. Money-moving flows (payments, wallet, invoice issue, quotation convert) are already atomic `SECURITY DEFINER` RPCs with `FOR UPDATE` locks and idempotency keys. The problems are **scale** problems: they get worse as rows, tenants and traffic grow. Two items are **functional bugs today** (#1, #2).

---

## Priority 1 — Fix now (functional / security bugs)

### 1. Document uploads over 1 MB fail — HIGH
- `next.config.ts` has no `experimental.serverActions.bodySizeLimit`; Next.js caps Server Action bodies at **1 MB** by default.
- `src/lib/documents/validation.ts:7` advertises `MAX_UPLOAD_BYTES = 25 MiB`; `src/app/(app)/documents/actions.ts` receives the file through a Server Action.
- Result: typical PDFs/scans are rejected by the framework before the action runs, with no friendly error.
- **Fix (quick):** `experimental: { serverActions: { bodySizeLimit: "26mb" } }`.
- **Fix (proper):** browser uploads directly to Supabase Storage via `createSignedUploadUrl`; the action only records metadata. This also removes findings #11 and #16.

### 2. Virus-scan parser can classify an infected file as clean — HIGH (security)
- `src/lib/documents/virus-scan.ts:59-61` checks `response.includes("OK")` **before** `includes("FOUND")`. A clamd reply like `stream: Some.Sig.OK-1 FOUND` returns `clean`.
- **Fix:** test `FOUND` first, or match exactly `/^stream: OK\0?$/`.

### 3. Upload pipeline is non-atomic and leaks storage objects — HIGH
- `src/app/(app)/documents/actions.ts:103-153`: storage upload → `documents` insert → `document_versions` insert → scan RPC. If either insert fails, the blob is orphaned in the private bucket, and a failed `document_versions` insert leaves a document with no version. The `mark_document_scanned` RPC error is never checked (line ~150), so the scan can fail silently while the user is told "uploaded".
- **Fix:** one RPC `create_document_with_version(...)` that inserts both rows in a single transaction; upload after it succeeds; clean up on failure; check the RPC error.

### 4. Quotation versions: race and empty-version path — MEDIUM (can produce a $0 invoice)
- `src/app/(app)/admin/billing/actions.ts:90-121` reads `current_version`, inserts `current_version + 1`, then inserts line items separately.
- Concurrent edits collide on `unique (quotation_id, version)` and surface a generic error.
- If the line-item insert fails, the version already exists and the AFTER INSERT trigger has already bumped `current_version`. `send_quotation`/`convert_quotation` then accept an **empty** version, so conversion creates a $0 invoice.
- **Fix:** RPC `add_quotation_version(p_quote, p_items jsonb)` with `SELECT … FOR UPDATE` that rejects empty items; also make `send_quotation` require ≥1 line item.

### 5. Other non-atomic multi-step writes — MEDIUM
| Location | Problem | Fix |
|---|---|---|
| `admin/billing/actions.ts:208-230` `createInvoice` | invoice then items; a failure leaves an empty draft, and retrying duplicates it | single RPC |
| `tickets/actions.ts:54-75` `createTicket` | ticket then first message via `reply_ticket`; a failure leaves a ticket with no message | RPC `open_ticket(...)` |
| `companies/actions.ts:329-348` `saveAddresses` | delete then insert per kind, delete error ignored | one `upsert([...], { onConflict: "company_id,kind" })` (unique constraint already exists) |

---

## Priority 2 — Biggest performance wins (steady-state cost per request)

### 6. RLS: `has_permission()` evaluated per row in ~45 policies — HIGH
- `has_permission` (`foundation.sql:292-325`) runs 3 sub-queries. Policies call it unwrapped, e.g. `rls.sql:37`, and across `catalogue_projects.sql`, `billing.sql`, `documents.sql`, `communication.sql`, `notifications_content.sql`, so Postgres re-runs it for every candidate row.
- The same files already wrap `is_administrator()` correctly as `(select public.is_administrator())`, so this is an inconsistency, not a design choice.
- **Fix:** new migration recreating these policies with `(select public.has_permission('…'))`. The result is then cached once per query as an InitPlan, which is typically a large speed-up on admin list pages.

### 7. RLS tenant gate `can_access_org()` is expensive per row — HIGH
- `foundation.sql:280-290` chains `is_administrator()` / `is_org_member()` / `is_assigned_staff()`, costing 3 profile lookups plus 2 more per row for non-admins. It gates organizations, projects, documents, invoices, payments, tickets, wallets and, through EXISTS, all their child tables.
- The same pattern is repeated in `can_see_document()` (`documents.sql:347-363`, which re-reads the document by PK) and `can_access_company()` (`companies.sql:160-192`).
- **Fix:** collapse the function to a single profile probe, and for hot tables use `organization_id in (select public.accessible_org_ids())`, a set-returning helper that the planner can hash-join. Child-table policies can rely on the RLS-filtered parent: `exists (select 1 from documents d where d.id = document_id)`.

### 8. Auth/profile fetched 3–4× per request with no `cache()` — HIGH
- Middleware `getUser()` → `(app)/layout.tsx:14-24` `getUser()` + profile → `admin/layout.tsx:16-26` again → many pages again. `getUser()` is a network call to Supabase Auth each time.
- `src/lib/supabase/server.ts:12` builds a fresh client per call, and nothing in `src/` uses React `cache()`.
- **Fix:** wrap `createClient` in `cache()`, and add cached `getCurrentUser()` / `getCurrentProfile()` helpers used by layouts and pages. Consider `auth.getClaims()` in middleware (local JWT verification) and keep one authoritative `getUser()` in the app layout.

### 9. Middleware runs on requests that don't need auth — MEDIUM
- `src/middleware.ts:16` excludes only images, `_next/*`, favicon and `brand/`. `/api/health`, `/auth/*` handlers, fonts/css/js/json and every `<Link>` prefetch still trigger `getUser()`. The health probe therefore depends on the auth server.
- **Fix:** add `api/health|auth/` and more file extensions to the negative lookahead, plus Supabase's recommended `missing: [{ type: "header", key: "next-router-prefetch" }, …]`.

### 10. Unbounded list queries (≈135 selects; only 5 use `.limit()`) — HIGH as data grows
- Admin lists with `select("*")` and no pagination: `admin/invoices`, `admin/projects`, `admin/quotations`, `admin/tickets`, `admin/companies`, `admin/users`, `admin/clients`, `admin/staff`, `admin/requests`. Client lists: `projects`, `orders`, `payments`, `invoices`, `tickets`, `documents`.
- Whole-table child fetches filtered later in JS:
  - `admin/documents/review/page.tsx:32-35`: **all** `document_versions`
  - `documents/page.tsx:69-76`: all documents and all versions; tab filters applied in JS (lines 100-122)
  - `admin/requests/page.tsx:27-30` and `requests/page.tsx`: all `data_request_submissions`, including `body`
  - `admin/payments/review/page.tsx:22-41`: all payments, partitioned in JS, then `.slice(0, 20)`
  - `compliance/page.tsx`: all deadlines, `status !== "completed"` filtered in JS
- "Fetch the whole lookup table to build a Map" on ~15 pages (`organizations`, `services`, `companies`, `profiles` in `admin/audit`). Use PostgREST embeds instead, e.g. `select("*, organizations(name)")`; the FKs exist. For `audit_logs.actor_id`, which has no FK, use `.in("id", actorIds)`.
- `(app)/layout.tsx:29-30` loads **every** organization on **every** navigation (for admins, the whole tenant list), but the topbar uses only `[0]` and `.length`.
- **Fix:** `?page=` + `.range()` + `count: "exact"`; name the columns you actually render; push filters into SQL.

### 11. Reports & CSV export do aggregation/serialization in Node — HIGH as data grows
- `admin/reports/page.tsx:40-70` fetches every project status and every invoice amount, then reduces in JS. Use `count: "exact", head: true` and a small SQL view/function for the sums.
- `admin/reports/export/route.ts:21-47` runs `invoices.select("*")` with no limit, builds the whole CSV string in memory, and fetches 17 columns to output 7. Its doc comment says the export is "audited", but no audit row is written.
- **Fix:** select only the 7 columns, stream a `ReadableStream` paging with `.range()`, and write the audit entry.

### 12. Missing indexes — MEDIUM
Foreign keys without indexes (these slow down cascading deletes, `set null` updates and joins):
```sql
create index projects_company_idx            on public.projects (company_id);
create index data_requests_company_idx       on public.data_requests (company_id);
create index documents_company_idx           on public.documents (company_id);
create index documents_uploaded_by_idx       on public.documents (uploaded_by);
create index quotations_project_idx          on public.quotations (project_id);
create index quotations_company_idx          on public.quotations (company_id);
create index invoices_project_idx            on public.invoices (project_id);
create index invoices_company_idx            on public.invoices (company_id);
create index wallet_ledger_invoice_idx       on public.wallet_ledger_entries (related_invoice_id);
create index wallet_ledger_payment_idx       on public.wallet_ledger_entries (related_payment_id);
create index tickets_project_idx             on public.tickets (project_id);
create index tickets_company_idx             on public.tickets (company_id);
create index company_update_requests_requested_by_idx on public.company_update_requests (requested_by);
create index notifications_org_idx           on public.notifications (organization_id);
create index ticket_messages_author_idx      on public.ticket_messages (author_id);
create index project_messages_author_idx     on public.project_messages (author_id);
```
Query-shape indexes:
```sql
-- notifications page sorts by created_at with no read_at filter; existing (user_id, read_at, created_at) can't serve it
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index tickets_org_updated_idx        on public.tickets (organization_id, updated_at desc);
create index profiles_role_status_idx       on public.profiles (role, status);
-- per-tenant "order by created_at desc" lists
create index projects_org_created_idx       on public.projects (organization_id, created_at desc);
create index invoices_org_created_idx       on public.invoices (organization_id, created_at desc);
-- audit search uses ilike '%x%'
create extension if not exists pg_trgm;
create index audit_logs_action_trgm_idx     on public.audit_logs using gin (action gin_trgm_ops);
```
Verify each index with `EXPLAIN ANALYZE` against realistic data before and after.

---

## Priority 3 — Medium / low

| # | Area | Finding | Fix |
|---|---|---|---|
| 13 | Waterfalls | memberships → organizations fetched serially in `companies`, `documents`, `quotations`, `tickets`, `wallet` pages (also a `"00000000-…"` sentinel hack); `services/[slug]` and `admin/clients/[id]` make 3 serial round-trips; `projects/[id]` and `tickets/[id]` await `getUser()` before independent fetches | embed `organization_memberships.select("organization_id, organizations(id,name,slug)")`; `Promise.all` |
| 14 | Waterfalls | `quotations/[id]` and `admin/quotations/[id]`: quotation → **all** versions → items (3 serial calls) | fetch only `version = current_version`, or one embedded query |
| 15 | Async work | virus scan runs inline (up to 30 s timeout) after rows are committed, holding a Node worker | run it after the response via `after()` from `next/server`, or a queue/Edge Function |
| 16 | Memory | upload buffers 25 MiB 2–3 times and hashes synchronously on the event loop (`documents/actions.ts:76,95`, `virus-scan.ts:69`) | solved by direct-to-storage upload (#1) |
| 17 | Data growth | `audit_logs` and `notifications` are append-only with no retention; `notify_org_members` fans out to every member | pg_cron retention job or monthly partitioning |
| 18 | Triggers | `protect_profile_columns` calls `has_permission` up to 4× per row (`foundation.sql:333-372`); `protect_invoice_items` does a per-line lookup; `set_updated_at` triggers have no `WHEN (old.* is distinct from new.*)` | compute once into variables; add `WHEN` guards |
| 19 | Hydration | `message-thread.tsx:59-62` `toLocaleString` without `timeZone` in a client component, which mismatches when server and browser time zones differ; same class for `formatDateUS` in `review-cards`, `project-controls`, `payment-review-card`, `review-request-card` | fixed `timeZone` in `src/lib/format.ts`, or pre-format on the server |
| 20 | Client fetch | `settings/security/mfa-manager.tsx:31-50` lists factors in `useEffect` after hydration | load `initialFactors` on the server page |
| 21 | Payload | full `ProfileRow` (address, phone, decision notes) serialized to client `AppShell` on every route (`(app)/layout.tsx:38-39`) | pass only `{ full_name, email, role }` |
| 22 | Caching | public, rarely-changing catalogue/help/perks pages query per request | `unstable_cache`/`"use cache"` + `revalidateTag` from admin publish actions |
| 23 | Revalidation | `documents/actions.ts:155`, `convertQuotationAction` (`billing/actions.ts:167`), and `sendAnnouncement` miss related paths (`/admin/documents/review`, `/admin/projects`, `/notifications`) | add targeted `revalidatePath` calls |
| 24 | Round-trips | 3 separate `has_permission` RPCs on `admin/projects/[id]`; `requestDownload` makes 3 serial queries | batch `has_permissions(text[])`; one embedded select |
| 25 | Singletons | `createAdminClient()`, `serverEnv()`/`publicEnv()` (Zod parse) rebuilt per call, including in middleware | module-level memoization |
| 26 | Over-fetch | `help_articles.select("*")` (full `body`) for index lists; `email_outbox.select("*")` on settings | name columns |
| 27 | Fonts | `globals.css:23-25` declares `"Inter"` but it is never loaded, so the page silently falls back to the system font | `next/font/google`, or drop it |
| 28 | UI | `topbar.tsx:32-47` document listeners stay attached while the menu is closed | attach only when `menuOpen` |
| 29 | Repo size | binaries are ~97% of the git pack: `legacy/dragon-demo/dragon.mp4` (1.6 MB), a second copy of the mp4 still in history, `docs/screenshots/*.png` (2 MB); none are referenced by `src/` | move to LFS/release assets; optionally `git filter-repo` |

## Verified as NOT problems
- Wallet/invoice balances only change inside `review_payment` with `FOR UPDATE` plus a unique `idempotency_key`. There is no app-side read-modify-write.
- Order, invoice and ticket numbers use sequences (no `max()+1`). `submit_data_request` locks its parent before numbering. `convert_quotation` is idempotent via `invoices.quotation_id UNIQUE`.
- Helper functions have the correct volatility (STABLE / VOLATILE).
- The service-role client is used only for storage and `mark_document_scanned`. All table writes run under the user session with RLS.
- No `revalidatePath("/", "layout")`. All 43 `"use client"` files genuinely need it. lucide-react is tree-shaken. There are no polling timers and no missing list keys.

## Recommended implementation order
1. **Hotfix PR:** #1 (body limit), #2 (scan parser), #3 (check the scan RPC error, clean up orphans). Small, high value.
2. **Per-request cost PR:** #8 (`cache()` helpers) and #9 (middleware matcher). Small diff, and every page benefits.
3. **RLS/index migration:** #6, #7, #12, in a new migration file. Benchmark with `EXPLAIN ANALYZE` and re-run the integration RLS test suite, since these tests guard tenant isolation.
4. **Atomic writes:** #4 and #5 as RPCs or an upsert, with integration tests.
5. **Pagination & SQL aggregation:** #10, #11, #13, #14, page by page.
6. **Upload redesign:** direct-to-storage upload + async scan (#1 proper, #15, #16).
7. Remaining low items, plus repo cleanup (#29, only with owner sign-off, since history rewriting affects all clones).
