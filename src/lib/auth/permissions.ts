/**
 * Granular permission framework — typed mirror of the database matrix.
 *
 * The database (`permissions`, `role_permissions`,
 * `user_permission_overrides`, SQL `has_permission()`) is the enforcement
 * layer; this module powers UI gating and server-side fast paths. A unit test
 * (tests/unit/role-permissions-sync.test.ts) fails the build if this file and
 * the seed migration diverge. Full rationale: docs/05-role-permission-matrix.md.
 */

export const ROLES = [
  "client",
  "moderator",
  "manager",
  "administrator",
] as const;

export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["moderator", "manager", "administrator"] as const;

export function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export const ACCOUNT_STATUSES = [
  "pending_approval",
  "active",
  "rejected",
  "suspended",
  "deactivated",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Permission catalogue (MASTER BUILD PROMPT §5 + §7). */
export const PERMISSIONS = {
  "clients.view_assigned": "View clients assigned to the staff member",
  "clients.view_all": "View every client account",
  "clients.create": "Create client accounts and invitations",
  "clients.update": "Update client account details",
  "clients.approve_registration": "Approve or reject pending registrations",
  "invitations.approve": "Approve invitation issuance and acceptance",
  "companies.view": "View company records",
  "companies.update_request_review": "Review company data update requests",
  "services.manage": "Manage service catalogue, plans, and fees",
  "projects.create": "Create projects/orders",
  "projects.assign": "Assign staff to projects",
  "projects.transition": "Move projects through allowed workflow stages",
  "projects.complete": "Complete projects",
  "requests.create": "Create data/document requests",
  "requests.review": "Review data-request submissions",
  "documents.upload": "Upload documents",
  "documents.review": "Approve or reject documents",
  "documents.delete_metadata": "Delete document metadata records",
  "quotations.create": "Draft quotations",
  "quotations.send": "Send quotations to clients",
  "quotations.convert": "Convert accepted quotations to orders",
  "invoices.create": "Create draft invoices",
  "invoices.issue": "Issue invoices to clients",
  "payments.review": "Review and approve payment proofs",
  "refunds.manage": "Manage refunds and credit notes",
  "tickets.reply": "Reply to support tickets",
  "tickets.assign": "Assign support tickets",
  "tickets.close": "Close support tickets",
  "notifications.send": "Compose and send notifications",
  "content.manage": "Manage Help Center and perks content",
  "users.roles.manage": "Manage user roles, memberships, and overrides",
  "settings.manage": "Manage business configuration and integrations",
  "audit.view": "View the audit log",
  "reports.view": "View operational and financial reports",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * Default grants per role. Administrator receives every permission (spec §7
 * "Full system access"); per-user deviations use audited database overrides,
 * never edits to this matrix at runtime.
 *
 * Client-capable permissions are additionally constrained to the client's own
 * organizations by Row Level Security — a permission never widens tenancy.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  client: ["companies.view", "documents.upload", "tickets.reply"],
  moderator: [
    "clients.view_assigned",
    "companies.view",
    "projects.transition",
    "requests.create",
    "documents.upload",
    "tickets.reply",
  ],
  manager: [
    "clients.view_assigned",
    "clients.update",
    "companies.view",
    "companies.update_request_review",
    "projects.create",
    "projects.assign",
    "projects.transition",
    "projects.complete",
    "requests.create",
    "requests.review",
    "documents.upload",
    "documents.review",
    "quotations.create",
    "quotations.send",
    "quotations.convert",
    "invoices.create",
    "tickets.reply",
    "tickets.assign",
    "tickets.close",
    "reports.view",
  ],
  administrator: ALL_PERMISSIONS,
};

export type PermissionOverride = {
  permission: Permission;
  effect: "allow" | "deny";
};

/**
 * Effective-permission check mirroring SQL `has_permission()`:
 * deny overrides beat role grants; allow overrides extend them; inactive
 * accounts have no permissions at all.
 */
export function hasPermission(
  input: {
    role: Role;
    status: AccountStatus;
    overrides?: readonly PermissionOverride[];
  },
  permission: Permission,
): boolean {
  if (input.status !== "active") return false;
  const override = input.overrides?.find(
    (candidate) => candidate.permission === permission,
  );
  if (override) return override.effect === "allow";
  return ROLE_PERMISSIONS[input.role].includes(permission);
}
