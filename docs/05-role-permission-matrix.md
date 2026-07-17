# Role–Permission Matrix

Roles: **Client**, **Moderator**, **Manager**, **Administrator** (spec §7). Administrator has full
system access (every permission). Clients act only inside their own organizations — tenancy is
enforced by RLS (`can_access_org`) *in addition to* any permission listed here; a permission never
widens a client's reach beyond their own organizations. Moderator/Manager reach is limited to
**assigned** organizations via `staff_assignments` (RLS-enforced), except where noted.

Defaults below are seeded into `role_permissions` (migration `..._seed_permissions.sql`) and
mirrored 1:1 in `src/lib/auth/permissions.ts`; a unit test fails if the two diverge. Per-user
deviations use audited `user_permission_overrides` (deny beats grant).

✅ = granted by default · ⚙️ = grantable per-user via override (spec: "if explicitly permitted") · — = not granted

| Permission | Client | Moderator | Manager | Administrator |
| --- | :-: | :-: | :-: | :-: |
| **Clients & registration** |
| `clients.view_assigned` | — | ✅ | ✅ | ✅ |
| `clients.view_all` | — | — | ⚙️ | ✅ |
| `clients.create` | — | — | ⚙️ | ✅ |
| `clients.update` | — | — | ✅ | ✅ |
| `clients.approve_registration` | — | — | ⚙️ | ✅ |
| `invitations.approve` | — | — | ⚙️ | ✅ |
| **Companies** |
| `companies.view` | ✅ (own orgs) | ✅ | ✅ | ✅ |
| `companies.update_request_review` | — | — | ✅ | ✅ |
| **Services & projects** |
| `services.manage` | — | — | — | ✅ |
| `projects.create` | — | — | ✅ | ✅ |
| `projects.assign` | — | — | ✅ | ✅ |
| `projects.transition` | — | ✅ (allowed stages) | ✅ | ✅ |
| `projects.complete` | — | — | ✅ | ✅ |
| `requests.create` | — | ✅ | ✅ | ✅ |
| `requests.review` | — | ⚙️ | ✅ | ✅ |
| **Documents** |
| `documents.upload` | ✅ (own orgs) | ✅ | ✅ | ✅ |
| `documents.review` | — | ⚙️ | ✅ | ✅ |
| `documents.delete_metadata` | — | — | — | ✅ |
| **Quotations & billing** |
| `quotations.create` | — | ⚙️ (draft only) | ✅ | ✅ |
| `quotations.send` | — | — | ✅ | ✅ |
| `quotations.convert` | — | — | ✅ | ✅ |
| `invoices.create` | — | — | ✅ | ✅ |
| `invoices.issue` | — | — | — | ✅ |
| `payments.review` | — | — | — | ✅ |
| `refunds.manage` | — | — | — | ✅ |
| **Communication** |
| `tickets.reply` | ✅ (own tickets) | ✅ | ✅ | ✅ |
| `tickets.assign` | — | — | ✅ | ✅ |
| `tickets.close` | — | — | ✅ | ✅ |
| `notifications.send` | — | — | ⚙️ | ✅ |
| **Platform** |
| `content.manage` | — | — | ⚙️ | ✅ |
| `users.roles.manage` | — | — | — | ✅ |
| `settings.manage` | — | — | — | ✅ |
| `audit.view` | — | — | ⚙️ | ✅ |
| `reports.view` | — | — | ✅ | ✅ |

## Notes and rules

1. **Administrator** — full access (spec §7 "Full system access"); the seed grants every permission
   so `has_permission()` needs no administrator special-case, and revoking a specific permission
   from a specific administrator remains possible via a deny override.
2. **Manager** — operational management for assigned scope: projects, quotations, invoices
   (create but not issue), tickets, reports; document review "if explicitly permitted" is granted by
   default per spec's manager description, while financial issuance/review stays administrator-only.
3. **Moderator** — assigned queues only: stage transitions, data requests, uploads, replies,
   drafting. Cannot manage roles/settings/integrations or finalize restricted financial/document
   actions "unless granted" → those appear as ⚙️ overrides, never defaults.
4. **Client** — client-capable permissions (`companies.view`, `documents.upload`,
   `tickets.reply`) are always additionally constrained by organization membership in RLS; the
   permission alone grants nothing outside the client's tenant.
5. `pending_approval`, `rejected`, `suspended`, `deactivated` accounts have **no** effective
   permissions regardless of role — `has_permission()` and `can_access_org()` both require
   `status = 'active'`.
6. Registration approval (`clients.approve_registration`) and invitation approval
   (`invitations.approve`) are separate auditable permissions per spec §5.
7. Later-phase modules must consume this matrix (SQL `has_permission()` server-side and the typed
   TS mirror for UI gating) — never role-name string checks.
