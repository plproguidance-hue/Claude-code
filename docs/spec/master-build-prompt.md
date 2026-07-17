# MASTER BUILD PROMPT — ProGuidance USA Client & Operations Portal

You are Claude Code acting as a senior product architect, UX lead, security engineer, and full-stack implementation team. Build a production-grade, original, USA-only client portal and internal operations portal for **ProGuidance Tech Solution**.

## 0. Execution mandate

Do not stop at a plan, wireframe, static mockup, or nonfunctional demo. Inspect the existing previous portal in the current workspace, preserve its useful business logic and supplied logo, then implement and verify the upgraded application end to end.

Work autonomously with reasonable defaults. Ask only when a truly blocking business decision cannot be inferred. Maintain a task list and complete every item. Do not claim an integration works unless it was exercised successfully. If credentials for an external service are unavailable, implement a production-ready adapter, environment-variable contract, safe local/test substitute, and exact setup documentation; label the integration as unconfigured rather than faking success.

Before editing:
1. Inventory the previous portal and identify its routes, components, company information, service catalogue, workflows, and reusable assets.
2. Preserve the original project in a backup branch/directory or make migration-friendly commits.
3. Produce a concise implementation plan and route/data/permission matrix.
4. Then build the application, run migrations, seed safe development data, execute all quality gates, and fix failures.

The upgraded application is a clean Next.js implementation. Do not directly port or preserve the old `.jsx`, Vite, or React Router framework files. Carry forward verified business logic, workflow stages, service catalogue data, navigation concepts, design tokens, and the supplied logo; reimplement them cleanly in the new architecture.

## 1. Product objective

Create a premium, secure portal where ProGuidance clients can:

- Join through invitation or approved registration.
- Onboard a new or existing US company.
- Purchase or request USA-focused services.
- Track each service as a project with milestones, deadlines, assigned staff, progress, messages, requested information, documents, invoices, and activity history.
- Upload and receive private business documents.
- Review quotations and accept or decline them.
- View invoices, submit payments/payment proof, and track a USD wallet/credit balance.
- Communicate with support and assigned staff.
- Receive clear notifications and compliance reminders.
- Manage profile, sessions, password, and two-factor authentication.

Also create the internal operational console required to make the client portal real. Administrators, managers, and moderators must be able to manage clients, companies, services, projects, workflows, documents, requests, quotations, invoices, payments, tickets, notifications, assignments, content, and audit history.

The result must be an original ProGuidance product. Use Business Globalizer only as workflow inspiration. Do not copy its logo, wording, proprietary content, client data, blue brand identity, or pixel-for-pixel design.

## 2. Authoritative company and brand configuration

Use a single typed configuration source and database-backed admin settings for these values:

- **Legal name:** ProGuidance Tech Solution
- **Brand name:** ProGuidance
- **Tagline:** Launch. Scale. Succeed.
- **Website:** https://proguidancetechsolution.com/
- **Public email:** proguidaance@gmail.com
- **Phone:** +880 1617 158 463
- **WhatsApp:** +880 1617 158 463
- **Address:** 30 N Gould St Ste 48621, Sheridan, WY 82801, USA
- **Business market:** United States only
- **Official portal currency:** USD only
- **Invoice prefix:** PG-INV-

The public email is intentionally spelled `proguidaance@gmail.com` with a double “a”; preserve this exact spelling unless the owner explicitly changes it.

Use the supplied `src/assets/logo.png` as the authoritative wordmark. It contains the orange/charcoal ProGuidance wordmark and “TECH SOLUTION” subline. Preserve its proportions and colors. Create optimized PNG/WebP sizes and, only if fidelity can be maintained, a vector/compact mark variant. Never stretch, recolor, redraw, crop, or replace it with generic text. Provide light-background, dark-background, favicon, and compact-sidebar usages. Keep meaningful alt text.

Do not seed prior sample client PII, EINs, member names, bank details, or identity documents into production migrations. Company identity above is business configuration; client records must use sanitized development fixtures.

## 3. USA-only scope

This portal serves US business formation, compliance, marketplace, payment, and digital-service workflows.

- Remove all UK, UAE, and multi-country tabs, copy, flags, plans, workflows, and country selectors.
- Remove BDT wallet conversion and currency exchange. USD is the only ledger/invoice currency.
- Support US states and territories through a canonical data source; never hardcode only a small shortlist.
- Allow LLC, C Corporation, S Corporation where legally appropriate, nonprofit, partnership, and sole-proprietorship/onboarding categories as configurable options. Do not present legal or tax advice as guaranteed.
- Include US address fields, EIN formatting, registered agent, formation state, filing date, annual-report due date, tax deadlines, and compliance status.
- Show clear disclaimers that ProGuidance provides professional processing/support and that government, platform, banking, tax, and third-party approval decisions are outside its control.
- USA-only means the companies, formation jurisdiction, compliance workflows, service catalogue, pricing, and billing are US-focused. Do not add UK/UAE/other-country business offerings. However, clients and beneficial owners may live outside the United States, so personal/member residential and mailing addresses may use an international country selector; company jurisdiction and registered-US-business address workflows remain United States only.

## 4. Design system and visual direction

Build a premium executive operations interface: clear, calm, modern, trustworthy, and information-dense without feeling crowded. It should look more advanced than the previous portal and more polished than the inspected Business Globalizer portal.

### Core palette

- Primary orange: `#FF4B00`
- Orange hover/depth: `#E64200`
- Charcoal/navy: `#3F4A4D`
- Graphite dark: `#273236`
- Page background: `#F6F7F9`
- Surface: `#FFFFFF`
- Primary text: `#172126`
- Secondary text: `#64748B`
- Border: `#E2E8F0`
- Success: `#16A34A`
- Warning: `#F59E0B`
- Error: `#DC2626`
- Information: `#2563EB`

Create semantic design tokens rather than scattering hex values. Support light mode first and a fully tested optional dark mode. Use Inter or a similarly professional variable sans-serif, with a disciplined type scale, tabular numerals for money/IDs, and WCAG-compliant contrast.

### Color grading and graphics

- Use charcoal-to-graphite depth in major dashboard and authentication surfaces, with controlled orange highlights and subtle warm glow.
- Use very light orange/amber mesh accents or abstract curved lines in hero/empty-state graphics; never flood operational pages with saturated gradients.
- Create original, lightweight abstract business graphics: US formation map/filing motifs, secure document vault, project milestone path, compliance calendar, support communication, invoices, and marketplace growth. Use SVG/CSS where possible.
- Each named graphic must be a multi-element SVG composition—not a single stock icon in a colored circle. Include at least a background/structural shape, one or more thematic elements, and a ProGuidance-palette accent. Optimize, label where needed, and verify responsive rendering.
- Avoid generic stock people, copied competitor illustrations, excessive glassmorphism, neon colors, or decorative elements that reduce readability.
- Charts must use the semantic palette and accessible patterns/labels, not color alone.

### Motion and animation

Use Motion/Framer Motion or an equivalent accessible library. Motion must clarify state, not distract:

- Route/content transition: 180–240 ms fade/translate.
- Drawer: approximately 220 ms slide with overlay fade.
- Modal: 160–200 ms scale/fade.
- Card entrance: optional 30–50 ms stagger on first load only.
- Progress bars and milestone completion: 600–800 ms ease-out.
- Button, icon, tab, and row hover/focus feedback: 120–180 ms.
- Skeleton loading for dashboards, tables, cards, and document lists.
- Animated success state after a verified action.
- No autoplay video, constant looping decoration, excessive parallax, or movement in financial/legal forms.
- Respect `prefers-reduced-motion`; all functionality must remain clear with motion disabled.

### Responsive behavior

Design mobile-first and verify at 360, 390, 768, 1024, 1280, and 1440+ widths:

- Desktop: collapsible 272 px sidebar, sticky top header, maximum readable content width.
- Tablet: compact sidebar or drawer.
- Mobile: bottom-priority navigation plus accessible slide-out menu; cards replace wide tables; sticky safe-area-aware action bars where useful.
- Tables require responsive card alternatives or intentional horizontal scrolling with visible affordance.
- Drawers become bottom sheets/full-screen panels on small devices.
- Never hide a critical action only on desktop.

## 5. Information architecture

### Authentication and account lifecycle

Create:

- `/login`
- `/register` or invitation acceptance
- `/pending-approval`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/mfa/challenge`
- `/recovery-codes`
- Expired/invalid invitation and session-expired states

Requirements:

- Email verification before access.
- Secure password rules, strength meter, show/hide controls, breached/common-password defense where supported.
- TOTP authenticator MFA with QR setup, one-time secret display, confirmation code, encrypted secret storage, regeneration/revocation, single-view recovery codes, and audit events.
- Session list with device, approximate location, last activity, revoke one, revoke all others.
- Rate limiting, lockout/backoff, generic authentication errors, and suspicious-login notifications.
- Never expose setup secrets after enrollment.
- Public self-registration creates a `pending_approval` account with no portal-data access. Show the `/pending-approval` holding page until an authorized administrator approves or rejects the registration. Invitation-accepted accounts may be pre-approved according to invitation policy. Add auditable `invitations.approve` and `clients.approve_registration` permissions.

### Client application shell

- Responsive sidebar and top header.
- Full ProGuidance logo plus compact brand mark.
- Global search/command palette for companies, projects, documents, invoices, tickets, and help.
- Notification center with unread count and preference controls.
- Current company/workspace switcher for clients with multiple companies.
- Assigned account manager/support contact.
- Settings/profile menu and safe sign-out.
- Breadcrumbs on deep pages.
- Consistent page title, description, primary action, filters, and contextual help.

### Client navigation

Organize navigation around client tasks rather than a flat list:

1. **Overview**
   - Dashboard
   - Activity
2. **My Business**
   - Companies
   - Company details
   - Compliance calendar
   - Existing company onboarding/transfer
3. **Services**
   - Catalogue & plans
   - Active projects
   - Order history
   - Quotations
4. **Documents**
   - Data requests
   - Document vault
   - Approval letters
   - Certificates
5. **Billing**
   - Invoices
   - Payments
   - Wallet/credits
   - Transactions
6. **Communication**
   - Project messages
   - Support tickets
   - Notifications
7. **Resources**
   - Help Center
   - Perks/resources
8. **Account**
   - Profile
   - Notification preferences
   - Security & sessions

Use expandable groups, meaningful icons, active states, badges for pending requests/unread messages/overdue invoices, and tooltips in collapsed mode.

## 6. Client pages and exact behavior

### 6.1 Dashboard

Build a personalized, action-oriented dashboard—not only KPI cards.

Top to bottom:

1. Welcome header with client name, selected company, compliance state, and assigned manager.
2. **Next Required Action** card, prioritized by urgency: requested document, overdue invoice, MFA setup, pending signature, quotation response, or approaching deadline.
3. Onboarding/completion checklist with percentage and contextual CTAs.
4. KPI cards: active services, pending client actions, upcoming deadlines, outstanding balance, completed services, open tickets.
5. Active project cards with service name, company, order ID, assigned staff, current stage, progress, SLA/estimated completion, last update, next step, and `View workspace`.
6. Compliance/deadline calendar: annual report, registered agent renewal, tax reminders, service-specific due dates.
7. Pending document/data requests with due dates and upload action.
8. Recent invoices/payments with status and amount.
9. Unified recent activity timeline.
10. Recent messages/notifications.
11. Quick actions: request service, upload document, request quotation, open ticket, view invoice, onboard existing company.

Every KPI must drill into a filtered page. Provide useful empty states with explanation and CTA.

### 6.2 Companies and company workspace

Support one client owning multiple US companies.

Company list cards:

- Legal name, DBA if any, entity type, state, formation date, EIN masked by default, compliance status, renewal due date, assigned staff, active projects.

Company detail tabs:

- Overview
- Formation and filing data
- Owners/members/officers
- Addresses and registered agent
- EIN/tax details
- Compliance calendar
- Services/projects
- Documents
- Invoices/payments
- Activity/audit history visible to client

Sensitive values are masked and revealed only after reauthentication where appropriate. Clients cannot silently edit authoritative filing data; they submit an update request with evidence. Staff review and approve changes.

### 6.3 New and existing company onboarding

Provide two guided funnels:

- Start a new US formation service.
- Onboard/transfer an existing US company to ProGuidance management.

Use a resumable multi-step wizard with autosave:

1. Formation state/entity type or existing-company basics.
2. Proposed/legal company name.
3. Business activity and purpose.
4. Owners/members/officers and ownership.
5. Contact and addresses.
6. Registered agent.
7. EIN/tax status.
8. Required documents.
9. Service/add-on selection.
10. Review, consent, disclosures, fee breakdown, and submission.

Show step validation, saved state, back/next, resume later, progress, fee breakdown, government-vs-professional fees, estimated turnaround, and confirmation. Never submit or charge from an accidental single click.

For company transfer, retain the competitor-inspired trust concepts in original ProGuidance language: secure/private handling, dedicated specialist, and ability to revise before filing. Do not promise reversibility after authority filing.

Do not use the phrase “Reversible Until Filing” or copy any Business Globalizer trust-card headline. Use original language such as “Make changes before we file” or “Revise before authority submission.”

### 6.4 Services, packages, and pricing

Catalogue supports search, category filters, compare, and configurable visibility.

Each service card/detail page must show:

- Name and category.
- Summary and detailed deliverables.
- Starting price in USD.
- Government/third-party fees separately.
- Estimated turnaround range and what may affect it.
- Eligibility and prerequisites.
- Required client information/documents.
- Payment requirement.
- Included support.
- Exclusions and disclaimer.
- Related services/add-ons.
- `Order service` or `Request quotation` CTA.

Seed the previous portal’s services as editable admin catalogue records; do not hardcode prices in UI. Mark all seed prices as requiring administrator verification before production:

- USA LLC Formation — $199
- EIN Application — $79
- ITIN Application — $149
- Resale Certificate — $59
- Walmart Seller Account Setup — $249
- Amazon Seller Account Setup — $249
- PayPal Setup — $99
- Stripe Setup — $99
- Wise Setup — $79
- Payoneer Setup — $79
- Bank Account Support — $149
- Virtual Address — $149
- Registered Agent — $99
- Annual Compliance Filing — $129
- Tax Filing — $299
- Bookkeeping — $99/month
- Marketplace Appeal — $199
- Website Development — $499
- Digital Marketing — $299/month

Service bundles/plans should have comparison tables, included features, exclusions, add-ons, savings, government-fee notes, turnaround, FAQs, and a confirmation step. No UK plans or country tabs.

The plan/bundle engine must be fully functional and admin-configurable. Do not invent bundle names, inclusions, discounts, or prices as real ProGuidance offers. Seed clearly labelled demonstration tiers only in development/test data, or leave production plans unpublished until an administrator verifies and publishes them.

### 6.5 Project/order workspace

Treat each purchased/accepted service as a project workspace. Use configurable workflow templates per service rather than one hardcoded progress percentage.

Seed these status concepts, with administrators able to configure valid transitions:

- Draft
- Order Submitted
- Payment Pending
- Payment Confirmed
- Information Required
- Documents Under Review
- Processing
- Submitted to Authority / Platform
- Waiting for Approval
- Completed
- Rejected / Issue Found
- On Hold
- Cancelled

Workspace header:

- Service, selected company, order/project ID, status, progress, created date, assigned manager/moderator, SLA/estimate, payment state.

Tabs:

- Overview and next action
- Milestones/timeline
- Tasks and data requests
- Documents
- Messages
- Invoices/payments
- Deliverables
- Activity history

Every status change must record actor, previous/new state, timestamp, note, and visibility. Distinguish client-visible updates from staff-only notes. Show whether the next action belongs to Client or ProGuidance. Prevent invalid transitions. Completed projects have a final summary, deliverables, completion date, feedback, and reopen/support route.

### 6.6 Data requests and tasks

Staff can request structured information or documents linked to a company/project.

Each request has:

- Title, description, type, related service/company, priority, due date, assigned reviewer, accepted file formats/size, status, instructions, admin note, rejection reason, submission versions, and reminders.

Statuses:

- Draft, Sent, Viewed, In Progress, Submitted, Under Review, Approved, Rejected/Changes Required, Overdue, Cancelled.

Client experience:

- Clear due date and urgency.
- Save draft.
- Upload or structured-form response.
- Replace/resubmit after rejection without destroying prior version.
- View reviewer feedback and full history.

### 6.7 Secure document vault

Tabs/filters:

- All
- Required
- Uploaded
- Under Review
- Approved
- Rejected/Changes Required
- Approval Letters
- Certificates
- Expiring/Expired

Document records require:

- Company/project, category, file name, MIME type, size, version, uploader, uploaded time, review status, reviewer, comment, expiry date, visibility, checksum, storage key, and audit events.

Requirements:

- Private storage only; never public bucket URLs.
- Short-lived signed previews/downloads after authorization.
- Drag/drop and mobile upload progress.
- Server-side MIME/magic-byte validation, size limits, safe filenames, virus/malware scan adapter, checksum, and quarantine state.
- Preview PDFs/images safely; download authorization on every request.
- Version history and restore metadata; never overwrite prior evidence silently.
- Approval/rejection with reason.
- Expiration reminders.
- Bulk admin request/upload/review where appropriate.
- Client-only and staff-only visibility.
- Implement a `VirusScanAdapter` with a local ClamAV container for development and a configurable production provider. If scanning is unconfigured, unavailable, or times out, keep every upload in `Quarantine`; it must not become previewable/downloadable by clients or ordinary staff until an authorized administrator manually releases or rejects it. Never auto-approve unscanned files.

### 6.8 Quotations

Clients can request a quote from a service or custom form. Staff can draft line items, discounts, taxes/fees, notes, validity date, terms, attachments, and versions.

Statuses:

- Requested, Under Review, Draft, Sent, Viewed, Changes Requested, Accepted, Declined, Expired, Converted.

Client quotation detail:

- Quote number, company, service, issue/expiry dates, line items, government/third-party fees separately, total, terms, timeline, staff contact, downloadable PDF.
- Accept/decline/request changes requires a confirmation dialog and records actor/time/IP metadata.
- Accepted quotation can convert to an order/project and invoice transactionally—never duplicate on retries.
- Conversion creates one project in `Order Submitted` status and one `Draft` invoice containing the accepted quotation line items. An authorized staff member must review and issue the invoice separately; only issuance changes it to `Sent` and triggers a payment notification. Quote acceptance must not auto-send the invoice or advance the project beyond `Order Submitted`.

### 6.9 Invoices, payments, wallet, and transactions

Official currency is USD only.

Invoices:

- Draft, Sent, Viewed, Partially Paid, Paid, Overdue, Void, Refunded.
- Line items, discounts, government/third-party fees, subtotal, tax where applicable, total, amount paid, balance, issue/due dates, notes, terms, related company/project.
- Professional PDF/print view using ProGuidance logo and invoice prefix.
- Immutable issued invoice snapshot with revision/credit-note workflow rather than silent editing.

Payment methods:

- Bank transfer.
- Wise.
- Manual payment/proof upload.
- Stripe and PayPal adapters only when configured and approved.

`Stripe Setup` and `PayPal Setup` in the service catalogue are services ProGuidance delivers to help clients configure their own merchant accounts. The Stripe/PayPal payment adapters in this billing section are separate integrations that allow clients to pay ProGuidance invoices. Model and implement these concepts independently.

Manual payment proof:

- Invoice, method, amount, transaction/reference ID, payment date, notes, private attachment.
- Statuses: Submitted, Under Review, Approved, Rejected, Reversed.
- Admin approval atomically updates payment, invoice balance/status, wallet ledger if applicable, notification, and audit log.

Wallet/credits:

- USD only.
- Available, pending, and held balances.
- Request top-up and admin approval.
- Append-only ledger with reference, type, debit/credit, amount, balance after, status, related invoice/order, actor, date.
- Idempotency keys and transactional updates. Never derive financial truth only from editable client state.
- No currency exchange and no BDT reference balance.

### 6.10 Messaging and support

Provide two related channels:

1. Project messages linked to a service workspace.
2. Support tickets for general or departmental issues.

Ticket departments:

- Sales
- Order Support
- Documents
- Accounting / Invoice
- Marketplace Support
- Technical Support
- Compliance / Tax
- General Support

Ticket fields:

- Ticket ID, company/project, department, subject, description, priority, status, assigned staff, SLA, created/updated, unread counts, attachments, tags.

Statuses:

- Open, Assigned, Waiting for Client, Waiting for Staff, Resolved, Closed, Reopened.

Requirements:

- Threaded conversation, safe private attachments, read state, timestamps, status history, internal notes, assignment/escalation, canned responses, client satisfaction, searchable history.
- Clients never see internal staff notes.
- Closed tickets are read-only unless explicitly reopened.
- Email/in-app notifications respect preferences and avoid duplicate sends.

### 6.11 Notifications

- In-app notification center grouped by Today/Earlier.
- Types: action required, document review, milestone/status update, message, invoice/payment, quotation, support, deadline/compliance, security.
- Read/unread, mark all read, per-type filters, deep links, pagination, and archive where useful.
- Email notification preferences by category, digest frequency, and mandatory security notifications.
- Use an outbox/job queue with retries and idempotency; do not send email inside a database transaction.

### 6.12 Help Center and perks/resources

Help Center:

- Searchable categories and articles.
- Contextual links from each module.
- Popular articles, related articles, feedback, and `Contact support` escalation.
- Admin content management and draft/publish states.
- Seed useful USA formation, documents, invoices, marketplace setup, annual compliance, account security, and support articles.
- Never leave a blank “no articles” production page.

Perks/resources:

- Search and categories.
- Partner/resource cards with logo, description, eligibility, benefit, disclosure, external-link safety, and active/expired state.
- Admin-managed order and visibility.
- Clearly disclose affiliate relationships.

### 6.13 Profile, preferences, and security

Profile:

- Avatar, name, verified email, phone, residential/mailing address, city, state/province/region, postal code, country, timezone, locale, and date/time format. Personal addresses may be international; company jurisdiction and USA-business addresses follow the USA-only rules above.
- Notification preferences.
- Company roles and access summary.
- Change-email verification flow.

Security:

- Password change with current-password verification.
- MFA lifecycle and recovery codes.
- Active sessions and revocation.
- Recent security activity.
- Optional download/export request and account-deletion request with administrator review/retention policy.

## 7. Internal admin/staff operations portal

Use the same application and design system with role-based routes such as `/admin` and `/staff`. Do not rely on hidden navigation; enforce every permission server-side and at the database/storage layer.

### Roles

#### Client
- Access only their organizations/companies, projects, documents, invoices, messages, tickets, quotations, and profile.
- Submit requested information, upload documents/payment proof, accept quotes, pay configured invoices, message, and open tickets.

#### Administrator
- Full system access.
- Manage clients, invitations, roles, permissions, companies, service catalogue, workflow templates, financial settings, document review, content, integrations, settings, and audit logs.
- Approve/reject documents and payments; create clients and staff.

#### Manager
- Access assigned teams/clients plus configurable management scope.
- Assign moderators, manage projects/statuses/tasks, create quotations/invoices, review documents if explicitly permitted, reply to tickets, and view operational reports.

#### Moderator
- Access only assigned clients/projects/queues.
- Update allowed workflow stages, request data, communicate, upload staff deliverables, reply to tickets, and draft records.
- Cannot manage roles, system settings, integrations, all clients, audit retention, or finalize restricted financial/document actions unless granted.

Use granular permissions rather than role-name checks alone. Suggested permissions:

- clients.view_assigned / clients.view_all / clients.create / clients.update
- companies.view / companies.update_request_review
- services.manage
- projects.create / projects.assign / projects.transition / projects.complete
- requests.create / requests.review
- documents.upload / documents.review / documents.delete_metadata
- quotations.create / quotations.send / quotations.convert
- invoices.create / invoices.issue / payments.review / refunds.manage
- tickets.reply / tickets.assign / tickets.close
- notifications.send
- content.manage
- users.roles.manage
- settings.manage
- audit.view / reports.view

### Admin modules

- Executive dashboard with revenue, outstanding balance, active clients, project pipeline, overdue actions, SLA breaches, document/payment review queues, ticket queue, and recent activity.
- Client directory and 360-degree client profile.
- Company directory and compliance calendar.
- Project/order board and table views with filters, bulk assignment, and valid transition controls.
- Workflow-template editor per service.
- Data-request and task templates.
- Secure document-review queue.
- Quotations and invoice builder.
- Payment-proof review and wallet ledger.
- Ticket inbox with assignments and SLA.
- Notification composer with audience preview and approval controls.
- Service/plan catalogue and price/fee configuration.
- Help/perks content management.
- Staff workload and assignment management.
- Reports/export with authorization and audit.
- Integration/configuration status page that never reveals secret values.
- Immutable audit log with filters and export permissions.

### Required admin/staff route inventory

- `/admin` — executive dashboard
- `/admin/clients` and `/admin/clients/:id` — client directory and 360-degree profile
- `/admin/companies` and `/admin/companies/:id` — company directory, detail, and compliance
- `/admin/projects` and `/admin/projects/:id` — project board/table and staff workspace
- `/admin/workflows` — workflow-template editor
- `/admin/documents/review` — document review/quarantine queue
- `/admin/requests` — data-request/task management
- `/admin/quotations` and `/admin/quotations/:id` — quotation list, builder, versions, and detail
- `/admin/invoices` and `/admin/invoices/:id` — invoice list, builder, issue/payment history
- `/admin/payments/review` — payment-proof review queue
- `/admin/tickets` and `/admin/tickets/:id` — ticket inbox and thread
- `/admin/notifications` — notification composer/history
- `/admin/catalogue` — service, plan, fee, and visibility editor
- `/admin/content` — Help Center and perks/resources management
- `/admin/staff` — staff, workload, teams, and assignments
- `/admin/reports` — authorized operational/financial exports
- `/admin/audit` — immutable audit-log viewer
- `/admin/settings` — business configuration, integrations, feature flags, and health status

Managers and moderators may use equivalent `/staff/...` routes or the same route components with permission-scoped data/actions. Every route requires loading, empty, error, forbidden, responsive, and accessibility states; a single generic admin table is not acceptable.

## 8. Data architecture

Use normalized PostgreSQL tables with UUIDs, timestamps, soft-delete/archival strategy where appropriate, and explicit foreign keys. At minimum model:

- users
- profiles
- organizations/client_accounts
- organization_memberships
- roles
- permissions
- role_permissions
- user_permission_overrides (optional, audited)
- invitations
- sessions
- mfa_methods
- recovery_codes
- companies
- company_owners_members
- company_addresses
- company_compliance_deadlines
- company_update_requests
- service_categories
- services
- service_plans
- service_plan_items
- workflow_templates
- workflow_template_steps
- projects/orders
- project_assignments
- project_milestones
- project_tasks
- project_status_history
- data_requests
- data_request_submissions
- documents
- document_versions
- document_reviews
- quotations
- quotation_versions
- quotation_line_items
- invoices
- invoice_line_items
- payments
- payment_proofs
- wallet_accounts
- wallet_ledger_entries
- conversations
- conversation_participants
- messages
- message_attachments
- tickets
- ticket_assignments
- notifications
- notification_preferences
- email_outbox/jobs
- help_categories
- help_articles
- perks_resources
- feedback
- audit_logs
- system_settings

Add indexes for tenant/company ownership, status queues, due dates, unread messages, invoice numbers, project/order IDs, ticket IDs, quotation IDs, and audit lookup. Use database transactions and idempotency constraints for quote conversion, payment approval, ledger writes, invoice updates, and notification jobs.

## 9. Technical architecture

Migrate the previous Vite-only prototype to a production full-stack architecture:

- **Framework:** latest stable Next.js App Router with TypeScript and strict mode.
- **UI:** Tailwind CSS, accessible Radix/shadcn primitives, Lucide icons, Motion/Framer Motion.
- **Backend/data:** Supabase PostgreSQL, Supabase Auth, Row Level Security, private Supabase Storage, and Realtime only where it provides real value. Keep database logic portable and typed.
- **Validation:** shared Zod schemas at every input boundary.
- **Forms:** React Hook Form or equivalent with server validation and accessible error summaries.
- **Server access:** server components/actions or route handlers with authorization rechecked server-side; never trust client role/company IDs.
- **Email:** Resend or SMTP adapter with React Email templates and a queued outbox.
- **Payments:** manual/Wise/bank proof first; optional Stripe/PayPal adapters behind feature flags and webhook signature verification.
- **Monitoring:** structured redacted logs, Sentry-compatible error monitoring, health/readiness endpoints, and audit events.
- **Deployment:** Vercel or container-compatible deployment, managed PostgreSQL/Supabase, private object storage, HTTPS, custom subdomain such as `portal.proguidancetechsolution.com`.

If Supabase credentials are not available, provide local Supabase setup/migrations and a documented demo mode that uses a local database—not browser-only fake data. Never put service-role keys in browser bundles.

If the existing public website remains WordPress, deploy the portal as a secure separate application/subdomain and link it from the website. Do not share WordPress cookies or expose portal documents through WordPress media uploads. Document a later OIDC/SSO option rather than inventing insecure SSO.

## 10. Security and privacy requirements

Treat uploaded identity, formation, tax, banking, marketplace, and payment documents as highly sensitive.

- Enforce tenant isolation with RLS and server authorization. Add automated cross-tenant denial tests.
- Default-deny private storage policies.
- TLS in transit and provider encryption at rest.
- Encrypt especially sensitive fields at application/database level where appropriate; manage keys outside source control.
- Mask EIN, identity, account, and payment values in UI/logs.
- Use short-lived signed URLs after authorization.
- CSRF defense, secure cookies, CSP, HSTS, frame protection, strict referrer policy, rate limiting, input validation, output encoding, and safe redirects.
- Validate file magic bytes/MIME/size and scan/quarantine uploads.
- Never store raw passwords, TOTP secrets, recovery codes, API keys, full card data, or bank credentials in logs.
- Verify webhook signatures and make handlers idempotent.
- Audit authentication, role/permission changes, document access/review, status transitions, quote acceptance, invoice issue, payment approval, ledger mutations, exports, and security changes.
- Define backup, point-in-time recovery, retention, export, legal hold, and deletion-request procedures.
- Use least privilege for staff and integrations.
- Prevent enumeration through login/reset/invitation responses.
- Add dependency scanning and secret scanning to CI.

## 11. Accessibility, UX, and content quality

- Target WCAG 2.2 AA.
- Semantic landmarks/headings, keyboard navigation, visible focus, labels, descriptions, error summaries, aria-live status updates, accessible modals/drawers, focus trap/return, and skip link.
- Never use color alone for status.
- Minimum 44×44 mobile targets where practical.
- Test screen-reader names for icon-only buttons.
- Provide skeleton, empty, error, offline/retry, permission denied, expired session, and not-found states.
- Empty states explain why the page is empty and provide the correct next action.
- Use natural, professional, concise language. Avoid hype, fake urgency, guaranteed approvals, fake testimonials, or legal/tax guarantees.
- Clearly distinguish ProGuidance service fees, government fees, third-party fees, and estimates.

## 12. Migration from the previous portal

Retain and improve these prior capabilities:

- ProGuidance logo, company identity, orange/charcoal brand, and tagline.
- Dashboard, company details, services/packages, active services, order history, data requests, document categories, invoices, custom invoices, payments/payment proof, wallet, transactions, tickets, notifications, quotations, existing US company onboarding, Help Center, perks/resources, profile, and security.
- Project progress/timeline, required documents, notes/messages, order activity, compliance reminders, quick actions, invoice PDF/print, support departments, and USD service catalogue.
- Client/Admin/Manager/Moderator vocabulary.

Replace prototype limitations:

- Eliminate browser-only mock data and fake success timers.
- Replace filename-only uploads with real private storage and validation.
- Replace simulated password/MFA switches with real secure flows.
- Replace disabled preview/download controls with authorized signed-file access.
- Replace incomplete payment gateway text with configured adapters and explicit feature states.
- Replace hardcoded sample company/EIN/member records with safe seed fixtures.
- Replace role documentation that is not enforced with real RLS/server permissions.
- Replace monolithic flat navigation with grouped, responsive task-oriented IA.
- Keep the old project available for comparison; document all migration decisions and data mappings.

## 13. Testing and quality gates

Implement and run:

- Unit tests with Vitest/Jest for validation, permissions, status transitions, totals, IDs, due dates, and formatting.
- Integration tests against a real test PostgreSQL/Supabase instance for tenant isolation, RLS, CRUD, transactions, and storage policies.
- Playwright end-to-end tests for Client, Admin, Manager, and Moderator.
- Accessibility tests with axe-core must report zero critical or serious violations on every core E2E page at 1280 px and 390 px viewports. Manually verify that every core E2E journey is completable by keyboard alone with visible focus at every interactive element. Report violation counts by severity; any critical violation blocks the definition of done.
- Responsive/visual screenshots for core pages at required breakpoints.
- Email template tests and outbox retry/idempotency tests.
- File authorization and malicious-file rejection tests.
- Webhook signature/idempotency tests when payment providers are configured.
- Build, type-check, lint, dependency audit, and secret scan.

Minimum E2E journeys:

1. Admin invites client; client verifies email, sets password, and enables MFA.
2. Client onboards an existing US company with a private formation document; staff reviews it.
3. Client orders/requests a service; invoice is issued; payment proof is submitted and approved; project activates once only.
4. Staff requests a document; client uploads; staff rejects with reason; client resubmits; staff approves; versions remain visible.
5. Project progresses through valid stages; invalid transitions are denied; client sees timeline and next action.
6. Client requests quote; staff sends version; client requests change; accepts final version; conversion creates one order and one invoice.
7. Client and assigned staff exchange project messages; unrelated staff/client cannot access them.
8. Client opens ticket; manager assigns moderator; internal note stays staff-only; client reply is visible; ticket resolves/reopens.
9. Cross-tenant user attempts to access another company, document, invoice, message, and signed URL; all are denied and audited.
10. Mobile client completes login/MFA, dashboard action, document upload, and ticket reply using keyboard/screen-reader-friendly controls.

Quality targets:

- Zero TypeScript errors.
- Zero lint errors.
- No high/critical dependency vulnerabilities.
- No known cross-tenant authorization failures.
- Core Web Vitals and reasonable performance budgets; lazy-load heavy charts/editors.
- No console errors on core journeys.
- All critical buttons and forms functional; no unlabeled fake controls.

## 14. Deliverables

Deliver all of the following:

- Working source code.
- Database schema, migrations, RLS/storage policies, and safe seed data.
- `.env.example` without secrets.
- Development and production setup instructions.
- Architecture and authorization documentation.
- Route/page inventory.
- Role-permission matrix.
- Data model diagram or Mermaid ERD.
- Workflow/status transition documentation.
- Service catalogue seed and admin editing instructions.
- Email templates.
- Test suite and real test output.
- Deployment guide, backup/restore procedure, monitoring setup, and rollback plan.
- Migration report from the previous portal.
- Screenshots of core desktop/tablet/mobile views.
- Known limitations list that distinguishes unconfigured external integrations from completed functionality.

## 15. Definition of done

The work is complete only when:

- The portal is a functional full-stack application, not a static frontend.
- All four roles are enforced by server/database policies.
- Client data and files are tenant-isolated and private.
- Every core client workflow has a real backend and verified E2E test.
- Admin/staff can actually operate the client workflows.
- USA-only content and USD-only billing are consistently enforced.
- ProGuidance company details and logo are correctly applied.
- The premium orange/charcoal design, original graphics, responsive layouts, and reduced-motion behavior are verified.
- Build, type-check, lint, tests, accessibility checks, and security checks pass.
- Documentation enables another developer to configure integrations and deploy safely.

At completion, report exactly:

1. What was implemented.
2. Architecture and key technical decisions.
3. Files/migrations created or changed.
4. Test/build/security results with real command output.
5. Screenshots/preview paths.
6. Integrations that are live versus waiting for credentials.
7. Remaining risks or manual setup steps.

Do not claim production readiness if any critical security, tenant isolation, data persistence, file privacy, role enforcement, or core workflow test remains incomplete.
