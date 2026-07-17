# Phase-by-Phase Implementation Plan

Sequencing rule: each phase ships runnable, tested, RLS-enforced functionality; later modules only
consume foundations (tenancy gate, permission framework, audit) — they never rework them. All
quality gates (typecheck, lint, unit, integration, build) must pass at each phase boundary.

## Phase 1 — Foundation (this delivery)

Identity, tenancy, roles/permissions, RLS, auth lifecycle, pending-registration approval, app
shell, brand system, local Supabase setup, cross-tenant denial tests. Scope details:
`docs/03-route-matrix.md`, `docs/04-data-model.md`, `docs/05-role-permission-matrix.md`.
Deliberately excluded (per phase instruction): companies, projects, documents, quotations,
invoices, payments, tickets, notifications modules.

## Phase 2 — Companies, onboarding, profile & security

- Tables: `companies`, `company_owners_members`, `company_addresses`,
  `company_compliance_deadlines`, `company_update_requests`; canonical US states/territories data
  source; EIN masking + reveal-on-reauth pattern.
- Client routes: `/companies`, `/companies/[id]` (all §6.2 tabs), new-formation and
  existing-company-transfer wizards (§6.3, resumable + autosave), `/compliance` calendar.
- Admin routes: `/admin/clients`, `/admin/companies` + update-request review queue.
- Invitation acceptance flow (`/invite/[token]`) with expiry/revocation states; invitation
  policy pre-approval.
- Full profile page (international personal addresses, timezone/locale) and Security settings:
  password change with current-password verification, TOTP MFA enrolment (QR, one-time secret,
  confirmation), recovery codes single-view, session list + revocation, security activity feed.
- Tests: company CRUD under RLS, update-request workflow, wizard autosave, MFA/session E2E once a
  live Supabase instance is available.

## Phase 3 — Service catalogue, plans, projects & data requests

- Tables: `service_categories`, `services`, `service_plans`, `service_plan_items`,
  `workflow_templates`, `workflow_template_steps`, `projects`, `project_assignments`,
  `project_milestones`, `project_tasks`, `project_status_history`, `data_requests`,
  `data_request_submissions`.
- Seed §6.4 catalogue (19 services, prices flagged "requires administrator verification");
  demonstration plan tiers unpublished by default.
- Status machine with configurable valid transitions (§6.5 list), actor/visibility-stamped
  history, staff-only notes, client "next action" ownership.
- Routes: client `/services`, `/plans`, `/projects`, `/projects/[id]`, `/orders`, `/requests`;
  admin `/admin/catalogue`, `/admin/workflows`, `/admin/projects`, `/admin/requests`.
- Tests: transition validity, permission-gated transitions, request resubmission versioning.

## Phase 4 — Secure document vault

- Tables: `documents`, `document_versions`, `document_reviews`; private Supabase Storage bucket
  with default-deny storage policies; short-lived signed URLs issued only after server
  authorization; checksum, MIME/magic-byte validation, size limits, safe filenames.
- `VirusScanAdapter` (local ClamAV for dev, configurable provider) with hard quarantine default.
- Review queue `/admin/documents/review`; client vault `/documents` with §6.7 tabs; version
  history without silent overwrite.
- Tests: storage policy denial, unauthorized signed-URL attempts, quarantine gating,
  malicious-file rejection.

## Phase 5 — Quotations, invoices, payments, wallet

- Tables: `quotations`, `quotation_versions`, `quotation_line_items`, `invoices`,
  `invoice_line_items`, `payments`, `payment_proofs`, `wallet_accounts`,
  `wallet_ledger_entries` (append-only) — USD only, `PG-INV-` numbering, immutable issued
  snapshots + credit-note revision.
- Transactional, idempotent quote→order+draft-invoice conversion (§6.8 rules: no auto-send, no
  auto-advance); manual/bank/Wise proof review with atomic approval; Stripe/PayPal pay-ProGuidance
  adapters behind feature flags with webhook signature verification (separate from the catalogue's
  "Stripe Setup"/"PayPal Setup" services).
- Routes: client `/quotations`, `/invoices`, `/payments`, `/wallet`, `/transactions`; admin
  builders + `/admin/payments/review`. Invoice PDF/print view with logo + prefix.
- Tests: conversion idempotency, ledger balance invariants, double-approval prevention.

## Phase 6 — Messaging & support tickets

- Tables: `conversations`, `conversation_participants`, `messages`, `message_attachments`,
  `tickets`, `ticket_assignments`; §6.10 departments, statuses, SLA fields, internal notes
  (staff-only via RLS), read state, canned responses.
- Routes: client `/messages`, `/tickets`; admin `/admin/tickets` inbox.
- Tests: participant-only access, internal-note invisibility to clients, closed-ticket
  read-only.

## Phase 7 — Notifications, email outbox, Help Center & perks

- Tables: `notifications`, `notification_preferences`, `email_outbox`, `help_categories`,
  `help_articles`, `perks_resources`, `feedback`; outbox job queue with retries + idempotency
  (never send inside a DB transaction); Resend/SMTP adapter + React Email templates.
- Routes: `/notifications`, `/help`, `/perks`; admin `/admin/notifications` composer,
  `/admin/content`.
- Seed Help Center articles (§6.12). Tests: outbox retry/idempotency, preference suppression,
  mandatory security notifications.

## Phase 8 — Admin operations completion & production hardening

- Executive dashboard metrics, `/admin/staff` workload, `/admin/reports` authorized exports,
  `/admin/audit` viewer, `/admin/settings` (DB-backed business config, integration status page
  that never reveals secrets, feature flags).
- Monitoring (structured redacted logs, Sentry-compatible), health/readiness endpoints, CSP/HSTS
  and remaining security headers review, rate limiting, dependency + secret scanning in CI.
- Full Playwright E2E suite (spec §13's ten journeys), axe-core accessibility gates at 1280/390,
  responsive screenshot set, performance budgets.
- Deployment guide (Vercel/container + `portal.proguidancetechsolution.com`), backup/PITR,
  rollback plan.

## Cross-phase invariants

- Never trust client-supplied role/organization IDs; every server action re-authorizes.
- Every new table: RLS enabled before first deploy, `can_access_org()` tenancy gate,
  `has_permission()` action gate, audit events for sensitive mutations, queue/due-date indexes.
- No integration claimed working without being exercised; unconfigured adapters labelled as such.
