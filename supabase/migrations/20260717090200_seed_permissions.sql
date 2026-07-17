-- ProGuidance Portal — permission catalogue and default role grants.
-- Mirrored 1:1 by src/lib/auth/permissions.ts; the sync unit test
-- (tests/unit/role-permissions-sync.test.ts) fails if the two diverge.
-- Matrix rationale: docs/05-role-permission-matrix.md

insert into public.permissions (key, description, category) values
  ('clients.view_assigned', 'View clients assigned to the staff member', 'clients'),
  ('clients.view_all', 'View every client account', 'clients'),
  ('clients.create', 'Create client accounts and invitations', 'clients'),
  ('clients.update', 'Update client account details', 'clients'),
  ('clients.approve_registration', 'Approve or reject pending registrations', 'clients'),
  ('invitations.approve', 'Approve invitation issuance and acceptance', 'clients'),
  ('companies.view', 'View company records', 'companies'),
  ('companies.update_request_review', 'Review company data update requests', 'companies'),
  ('services.manage', 'Manage service catalogue, plans, and fees', 'services'),
  ('projects.create', 'Create projects/orders', 'projects'),
  ('projects.assign', 'Assign staff to projects', 'projects'),
  ('projects.transition', 'Move projects through allowed workflow stages', 'projects'),
  ('projects.complete', 'Complete projects', 'projects'),
  ('requests.create', 'Create data/document requests', 'projects'),
  ('requests.review', 'Review data-request submissions', 'projects'),
  ('documents.upload', 'Upload documents', 'documents'),
  ('documents.review', 'Approve or reject documents', 'documents'),
  ('documents.delete_metadata', 'Delete document metadata records', 'documents'),
  ('quotations.create', 'Draft quotations', 'billing'),
  ('quotations.send', 'Send quotations to clients', 'billing'),
  ('quotations.convert', 'Convert accepted quotations to orders', 'billing'),
  ('invoices.create', 'Create draft invoices', 'billing'),
  ('invoices.issue', 'Issue invoices to clients', 'billing'),
  ('payments.review', 'Review and approve payment proofs', 'billing'),
  ('refunds.manage', 'Manage refunds and credit notes', 'billing'),
  ('tickets.reply', 'Reply to support tickets', 'communication'),
  ('tickets.assign', 'Assign support tickets', 'communication'),
  ('tickets.close', 'Close support tickets', 'communication'),
  ('notifications.send', 'Compose and send notifications', 'communication'),
  ('content.manage', 'Manage Help Center and perks content', 'platform'),
  ('users.roles.manage', 'Manage user roles, memberships, and overrides', 'platform'),
  ('settings.manage', 'Manage business configuration and integrations', 'platform'),
  ('audit.view', 'View the audit log', 'platform'),
  ('reports.view', 'View operational and financial reports', 'platform');

-- Client: tenancy-scoped basics (RLS constrains all of these to the
-- client's own organizations).
insert into public.role_permissions (role, permission_key) values
  ('client', 'companies.view'),
  ('client', 'documents.upload'),
  ('client', 'tickets.reply');

-- Moderator: assigned queues only.
insert into public.role_permissions (role, permission_key) values
  ('moderator', 'clients.view_assigned'),
  ('moderator', 'companies.view'),
  ('moderator', 'projects.transition'),
  ('moderator', 'requests.create'),
  ('moderator', 'documents.upload'),
  ('moderator', 'tickets.reply');

-- Manager: operational management for assigned scope; financial issuance
-- and platform administration remain administrator-only.
insert into public.role_permissions (role, permission_key) values
  ('manager', 'clients.view_assigned'),
  ('manager', 'clients.update'),
  ('manager', 'companies.view'),
  ('manager', 'companies.update_request_review'),
  ('manager', 'projects.create'),
  ('manager', 'projects.assign'),
  ('manager', 'projects.transition'),
  ('manager', 'projects.complete'),
  ('manager', 'requests.create'),
  ('manager', 'requests.review'),
  ('manager', 'documents.upload'),
  ('manager', 'documents.review'),
  ('manager', 'quotations.create'),
  ('manager', 'quotations.send'),
  ('manager', 'quotations.convert'),
  ('manager', 'invoices.create'),
  ('manager', 'tickets.reply'),
  ('manager', 'tickets.assign'),
  ('manager', 'tickets.close'),
  ('manager', 'reports.view');

-- Administrator: full system access (every permission, current and future
-- rows in this catalogue seeding).
insert into public.role_permissions (role, permission_key)
select 'administrator'::public.app_role, p.key
  from public.permissions p;
