import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  hasPermission,
} from "@/lib/auth/permissions";
import {
  actAs,
  actAsSuperuser,
  closePool,
  createFixtures,
  user,
  type FixtureIds,
} from "./helpers";

/**
 * Parity proofs: the database permission matrix (`permissions`,
 * `role_permissions`, SQL `has_permission()`) must behave identically to the
 * TypeScript mirror used for UI gating.
 */

let ids: FixtureIds;

beforeAll(async () => {
  ids = await createFixtures("3");
});

afterAll(async () => {
  await closePool();
});

describe("catalogue parity", () => {
  it("database permission catalogue matches the TypeScript catalogue", async () => {
    const dbKeys = await actAsSuperuser(async (db) => {
      const { rows } = await db.query(`select key from public.permissions`);
      return rows.map((row) => row.key).sort();
    });
    expect(dbKeys).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("database role grants match the TypeScript matrix for every role", async () => {
    const dbGrants = await actAsSuperuser(async (db) => {
      const { rows } = await db.query(
        `select role, permission_key from public.role_permissions`,
      );
      return rows as { role: string; permission_key: string }[];
    });

    for (const role of ROLES) {
      const fromDb = dbGrants
        .filter((grant) => grant.role === role)
        .map((grant) => grant.permission_key)
        .sort();
      const fromTs = [...ROLE_PERMISSIONS[role]].sort();
      expect(fromDb, `role ${role}`).toEqual(fromTs);
    }
  });
});

describe("has_permission() parity with the TypeScript mirror", () => {
  it("agrees for every role × permission pair", async () => {
    const roleUsers = {
      client: ids.clientA,
      moderator: ids.moderatorA,
      manager: ids.managerA,
      administrator: ids.admin,
    } as const;

    for (const role of ROLES) {
      const results = await actAs(user(roleUsers[role]), async (db) => {
        const map = new Map<string, boolean>();
        for (const permission of ALL_PERMISSIONS) {
          const { rows } = await db.query(
            `select public.has_permission($1) as ok`,
            [permission],
          );
          map.set(permission, rows[0].ok as boolean);
        }
        return map;
      });

      for (const permission of ALL_PERMISSIONS) {
        const expected = hasPermission(
          { role, status: "active" },
          permission,
        );
        expect(
          results.get(permission),
          `${role} → ${permission}`,
        ).toBe(expected);
      }
    }
  });
});

describe("per-user overrides", () => {
  it("a deny override beats the role grant", async () => {
    const client = await (async () => {
      // Single transaction: superuser plants the override, then the session
      // switches to the manager to observe the effect; rollback cleans up.
      const pool = (await import("./helpers")).getPool();
      return pool.connect();
    })();
    try {
      await client.query("begin");
      await client.query(
        `insert into public.user_permission_overrides (user_id, permission_key, effect, reason)
         values ($1, 'documents.review', 'deny', 'test')`,
        [ids.managerA],
      );
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: ids.managerA, role: "authenticated" }),
      ]);
      const { rows } = await client.query(
        `select public.has_permission('documents.review') as ok`,
      );
      expect(rows[0].ok).toBe(false);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("an allow override extends beyond the role grant", async () => {
    const { getPool } = await import("./helpers");
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into public.user_permission_overrides (user_id, permission_key, effect, reason)
         values ($1, 'documents.review', 'allow', 'test grant')`,
        [ids.moderatorA],
      );
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: ids.moderatorA, role: "authenticated" }),
      ]);
      const { rows } = await client.query(
        `select public.has_permission('documents.review') as ok`,
      );
      expect(rows[0].ok).toBe(true);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("override changes are written to the audit log", async () => {
    await actAsSuperuser(async (db) => {
      await db.query(
        `insert into public.user_permission_overrides (user_id, permission_key, effect, reason)
         values ($1, 'audit.view', 'allow', 'audited test')`,
        [ids.moderatorA],
      );
      const { rows } = await db.query(
        `select count(*)::int as n from public.audit_logs
          where action = 'permission_override.insert'
            and entity_id = $1 || ':audit.view'`,
        [ids.moderatorA],
      );
      expect(rows[0].n).toBe(1);
    });
  });
});
