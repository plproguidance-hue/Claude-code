# Route Matrix

Full portal route inventory from the MASTER BUILD PROMPT (§5–§7), tagged with build phase and
current status. **Phase 1 implements the authentication/lifecycle surface, the protected shell, and
the admin registration/user foundations only.** Later-phase routes are reserved here so navigation,
permissions, and data are designed for them from the start.

Legend — Status: ✅ implemented (Phase 1) · 🔜 reserved (listed phase) · Access: `public`,
`auth` (any signed-in), `active` (approved account), plus required permission keys.

## Authentication & account lifecycle

| Route | Access | Phase | Status | Behaviour |
| --- | --- | --- | --- | --- |
| `/login` | public | 1 | ✅ | Email+password sign-in (Supabase Auth), generic error copy (no account enumeration), links to register/forgot. |
| `/register` | public | 1 | ✅ | Public self-registration → creates `pending_approval` profile via DB trigger; email verification required. |
| `/pending-approval` | auth | 1 | ✅ | Holding page for unapproved accounts; no portal data access; safe sign-out. |
| `/verify-email` | public | 1 | ✅ | Post-registration instruction page + resend verification action. |
| `/forgot-password` | public | 1 | ✅ | Reset request; always-generic success response. |
| `/reset-password` | auth (recovery link) | 1 | ✅ | New-password form after recovery-code exchange. |
| `/mfa/challenge` | auth (AAL1→AAL2) | 1 | ✅ | TOTP challenge for enrolled users (Supabase MFA verify). Not exercisable without a live Supabase instance — see report. |
| `/recovery-codes` | active | 1 | ✅ | Placeholder surface for single-view recovery codes; full TOTP enrolment UX lands with Security settings (Phase 2). |
| `/auth/callback` (route handler) | public | 1 | ✅ | OAuth/email-link code exchange (`exchangeCodeForSession`) → safe internal redirect. |
| `/auth/confirm` (route handler) | public | 1 | ✅ | `verifyOtp` token-hash handler for email verification / recovery links. |
| `/auth/sign-out` (POST) | auth | 1 | ✅ | Server action sign-out, cookie cleanup, redirect to `/login`. |
| Invitation acceptance (`/invite/[token]`) | public | 2 | 🔜 | Pre-approved account per invitation policy; expired/invalid states. |

## Client application shell (protected)

| Route | Access | Phase | Status | Behaviour |
| --- | --- | --- | --- | --- |
| `/` | public | 1 | ✅ | Redirects: signed-in+active → `/dashboard`; signed-in+pending → `/pending-approval`; else `/login`. |
| `/dashboard` | active | 1 | ✅ (foundation) | Shell + welcome header, org context, empty-state cards. Full action-oriented dashboard (§6.1) in Phase 2+. |
| `/settings/profile` | active | 1 | ✅ (foundation) | Profile basics (name, email view). Full profile per §6.13 in Phase 2. |
| `/settings/security` | active | 2 | 🔜 | Password change, MFA lifecycle, sessions, recovery codes. |
| `/settings/notifications` | active | 7 | 🔜 | Notification preferences. |
| `/activity` | active | 2 | 🔜 | Unified activity timeline. |

## Client — My Business (Phase 2)

| Route | Access | Phase | Status |
| --- | --- | --- | --- |
| `/companies` · `/companies/[id]` (tabs: overview, formation, owners, addresses/agent, EIN/tax, compliance, services, documents, invoices, activity) | active | 2 | 🔜 |
| `/companies/onboard` (new formation funnel) · `/companies/transfer` (existing-company funnel) | active | 2 | 🔜 |
| `/compliance` (calendar) | active | 2 | 🔜 |

## Client — Services & projects (Phase 3)

| Route | Phase | Status |
| --- | --- | --- |
| `/services` (catalogue), `/services/[slug]`, `/plans` | 3 | 🔜 |
| `/projects` (active), `/projects/[id]` (workspace tabs §6.5), `/orders` (history) | 3 | 🔜 |
| `/requests` (data requests §6.6) | 3 | 🔜 |

## Client — Documents (Phase 4), Billing (Phase 5), Communication (Phase 6–7), Resources (Phase 7)

| Route | Phase | Status |
| --- | --- | --- |
| `/documents` (vault tabs §6.7) | 4 | 🔜 |
| `/quotations`, `/quotations/[id]` | 5 | 🔜 |
| `/invoices`, `/invoices/[id]`, `/payments`, `/wallet`, `/transactions` | 5 | 🔜 |
| `/messages` (project messages), `/tickets`, `/tickets/[id]` | 6 | 🔜 |
| `/notifications` | 7 | 🔜 |
| `/help`, `/help/[category]/[article]`, `/perks` | 7 | 🔜 |

## Admin / staff operations portal

All `/admin` routes are server-enforced: active account + staff role + per-route permission (listed),
re-checked in RLS. Managers/moderators reach permission-scoped equivalents per spec §7.

| Route | Permission | Phase | Status |
| --- | --- | --- | --- |
| `/admin` (executive dashboard) | staff role | 1 | ✅ (foundation: queues/counters for registrations & users) |
| `/admin/registrations` | `clients.approve_registration` | 1 | ✅ Approve/reject pending registrations with audit trail. |
| `/admin/users` | `users.roles.manage` | 1 | ✅ (foundation: directory, roles, org assignment view) |
| `/admin/clients`, `/admin/clients/[id]` | `clients.view_all` / `clients.view_assigned` | 2 | 🔜 |
| `/admin/companies`, `/admin/companies/[id]` | `companies.view` | 2 | 🔜 |
| `/admin/projects`, `/admin/projects/[id]` | `projects.*` | 3 | 🔜 |
| `/admin/workflows` | `services.manage` | 3 | 🔜 |
| `/admin/requests` | `requests.create` / `requests.review` | 3 | 🔜 |
| `/admin/documents/review` | `documents.review` | 4 | 🔜 |
| `/admin/quotations`, `/admin/quotations/[id]` | `quotations.*` | 5 | 🔜 |
| `/admin/invoices`, `/admin/invoices/[id]` | `invoices.*` | 5 | 🔜 |
| `/admin/payments/review` | `payments.review` | 5 | 🔜 |
| `/admin/tickets`, `/admin/tickets/[id]` | `tickets.*` | 6 | 🔜 |
| `/admin/notifications` | `notifications.send` | 7 | 🔜 |
| `/admin/catalogue` | `services.manage` | 3 | 🔜 |
| `/admin/content` | `content.manage` | 7 | 🔜 |
| `/admin/staff` | `users.roles.manage` | 8 | 🔜 |
| `/admin/reports` | `reports.view` | 8 | 🔜 |
| `/admin/audit` | `audit.view` | 8 | 🔜 (audit *data* recorded from Phase 1) |
| `/admin/settings` | `settings.manage` | 8 | 🔜 (`system_settings` table exists from Phase 1) |

## Global route-protection rules (implemented Phase 1)

1. Middleware refreshes the Supabase session on every request (`@supabase/ssr`).
2. Unauthenticated access to protected paths → redirect `/login?next=…` (internal-only redirect targets).
3. Authenticated but `status = 'pending_approval'` → forced to `/pending-approval`; `rejected`/`suspended` → informative lockout page; account lifecycle is additionally enforced by RLS (`is_active_user()`), so even a bypassed redirect exposes no data.
4. Authenticated & active on auth pages → redirect `/dashboard`.
5. `/admin/*` requires staff role + permission server-side; data access is enforced again by RLS.
