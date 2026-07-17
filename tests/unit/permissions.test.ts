import { describe, expect, it } from "vitest";

import {
  ACCOUNT_STATUSES,
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  hasPermission,
  isStaffRole,
} from "@/lib/auth/permissions";

describe("permission catalogue", () => {
  it("contains the auditable registration/invitation approval permissions (spec §5)", () => {
    expect(ALL_PERMISSIONS).toContain("clients.approve_registration");
    expect(ALL_PERMISSIONS).toContain("invitations.approve");
  });

  it("contains every suggested permission from spec §7", () => {
    for (const key of [
      "clients.view_assigned",
      "clients.view_all",
      "clients.create",
      "clients.update",
      "companies.view",
      "companies.update_request_review",
      "services.manage",
      "projects.create",
      "projects.assign",
      "projects.transition",
      "projects.complete",
      "requests.create",
      "requests.review",
      "documents.upload",
      "documents.review",
      "documents.delete_metadata",
      "quotations.create",
      "quotations.send",
      "quotations.convert",
      "invoices.create",
      "invoices.issue",
      "payments.review",
      "refunds.manage",
      "tickets.reply",
      "tickets.assign",
      "tickets.close",
      "notifications.send",
      "content.manage",
      "users.roles.manage",
      "settings.manage",
      "audit.view",
      "reports.view",
    ]) {
      expect(ALL_PERMISSIONS, key).toContain(key);
    }
  });

  it("every role grant references a catalogued permission", () => {
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(PERMISSIONS[permission], `${role} → ${permission}`).toBeTruthy();
      }
    }
  });
});

describe("role defaults", () => {
  it("administrator holds every permission (full system access)", () => {
    expect([...ROLE_PERMISSIONS.administrator].sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });

  it("clients never hold staff/financial/platform permissions", () => {
    for (const forbidden of [
      "clients.approve_registration",
      "users.roles.manage",
      "settings.manage",
      "invoices.issue",
      "payments.review",
      "audit.view",
      "documents.review",
      "projects.transition",
    ] as const) {
      expect(ROLE_PERMISSIONS.client).not.toContain(forbidden);
    }
  });

  it("moderators cannot finalize restricted financial/document actions by default", () => {
    for (const forbidden of [
      "documents.review",
      "invoices.issue",
      "payments.review",
      "users.roles.manage",
      "settings.manage",
      "quotations.send",
    ] as const) {
      expect(ROLE_PERMISSIONS.moderator).not.toContain(forbidden);
    }
  });

  it("managers cannot issue invoices or review payments (administrator-only)", () => {
    expect(ROLE_PERMISSIONS.manager).not.toContain("invoices.issue");
    expect(ROLE_PERMISSIONS.manager).not.toContain("payments.review");
    expect(ROLE_PERMISSIONS.manager).toContain("invoices.create");
  });

  it("role hierarchy is monotonic: moderator ⊆ manager ⊆ administrator", () => {
    for (const permission of ROLE_PERMISSIONS.moderator) {
      expect(ROLE_PERMISSIONS.manager, permission).toContain(permission);
    }
    for (const permission of ROLE_PERMISSIONS.manager) {
      expect(ROLE_PERMISSIONS.administrator, permission).toContain(permission);
    }
  });
});

describe("hasPermission()", () => {
  it("denies every permission to non-active accounts, regardless of role", () => {
    for (const status of ACCOUNT_STATUSES) {
      if (status === "active") continue;
      expect(
        hasPermission({ role: "administrator", status }, "audit.view"),
      ).toBe(false);
    }
  });

  it("grants role defaults to active accounts", () => {
    expect(
      hasPermission({ role: "client", status: "active" }, "documents.upload"),
    ).toBe(true);
    expect(
      hasPermission({ role: "client", status: "active" }, "invoices.issue"),
    ).toBe(false);
  });

  it("deny override beats the role grant", () => {
    expect(
      hasPermission(
        {
          role: "manager",
          status: "active",
          overrides: [{ permission: "documents.review", effect: "deny" }],
        },
        "documents.review",
      ),
    ).toBe(false);
  });

  it("allow override extends beyond the role grant", () => {
    expect(
      hasPermission(
        {
          role: "moderator",
          status: "active",
          overrides: [{ permission: "documents.review", effect: "allow" }],
        },
        "documents.review",
      ),
    ).toBe(true);
  });
});

describe("isStaffRole()", () => {
  it("classifies the four roles per spec vocabulary", () => {
    expect(isStaffRole("client")).toBe(false);
    expect(isStaffRole("moderator")).toBe(true);
    expect(isStaffRole("manager")).toBe(true);
    expect(isStaffRole("administrator")).toBe(true);
  });
});
