import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  anon,
  closePool,
  createFixtures,
  user,
  type FixtureIds,
} from "./helpers";

/**
 * Cross-tenant denial proofs (MASTER BUILD PROMPT §10): one organization must
 * never be able to read or mutate another organization's records. Runs
 * against a real PostgreSQL database with the production migrations applied.
 */

let ids: FixtureIds;

beforeAll(async () => {
  ids = await createFixtures("1");
});

afterAll(async () => {
  await closePool();
});

describe("anonymous access", () => {
  it("sees zero rows in every tenant table", async () => {
    await actAs(anon, async (db) => {
      for (const table of [
        "organizations",
        "profiles",
        "organization_memberships",
        "staff_assignments",
        "invitations",
        "audit_logs",
        "user_permission_overrides",
        "system_settings",
      ]) {
        const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
        expect(rows[0].n, table).toBe(0);
      }
    });
  });

  it("cannot insert an organization", async () => {
    await expect(
      actAs(anon, (db) =>
        db.query(
          `insert into public.organizations (name, slug) values ('X', 'anon-x')`,
        ),
      ),
    ).rejects.toThrow(/row-level security|permission denied/i);
  });
});

describe("client tenant isolation", () => {
  it("client A sees only their own organization", async () => {
    const slugs = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `select slug from public.organizations order by slug`,
      );
      return rows.map((row) => row.slug);
    });
    expect(slugs).toEqual(["fix1-org-a"]);
  });

  it("client A cannot fetch org B by primary key", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`select * from public.organizations where id = $1`, [ids.orgB]),
    );
    expect(rowCount).toBe(0);
  });

  it("client B sees only their own organization", async () => {
    const slugs = await actAs(user(ids.clientB), async (db) => {
      const { rows } = await db.query(`select slug from public.organizations`);
      return rows.map((row) => row.slug);
    });
    expect(slugs).toEqual(["fix1-org-b"]);
  });

  it("client A sees only memberships of their own organization", async () => {
    const orgs = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `select distinct organization_id from public.organization_memberships`,
      );
      return rows.map((row) => row.organization_id);
    });
    expect(orgs).toEqual([ids.orgA]);
  });

  it("client A sees only their own profile", async () => {
    const emails = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(`select id from public.profiles`);
      return rows.map((row) => row.id);
    });
    expect(emails).toEqual([ids.clientA]);
  });

  it("client A cannot update org B (0 rows affected)", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`update public.organizations set name = 'Hacked' where id = $1`, [
        ids.orgB,
      ]),
    );
    expect(rowCount).toBe(0);
  });

  it("client A cannot update their own org either (no clients.update)", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`update public.organizations set name = 'Renamed' where id = $1`, [
        ids.orgA,
      ]),
    );
    expect(rowCount).toBe(0);
  });

  it("client A cannot insert a membership into org B", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.organization_memberships (organization_id, user_id)
           values ($1, $2)`,
          [ids.orgB, ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("client A cannot create organizations", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.organizations (name, slug) values ('Rogue', 'rogue-org')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("client A cannot delete org B memberships (0 rows affected)", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(
        `delete from public.organization_memberships where organization_id = $1`,
        [ids.orgB],
      ),
    );
    expect(rowCount).toBe(0);
  });

  it("client A cannot read the audit log", async () => {
    const { rows } = await actAs(user(ids.clientA), (db) =>
      db.query(`select count(*)::int as n from public.audit_logs`),
    );
    expect(rows[0].n).toBe(0);
  });

  it("client A cannot promote themselves to administrator", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `update public.profiles set role = 'administrator' where id = $1`,
          [ids.clientA],
        ),
      ),
    ).rejects.toThrow(/users\.roles\.manage/i);
  });

  it("a pending user cannot self-approve their own registration", async () => {
    await expect(
      actAs(user(ids.pendingA), (db) =>
        db.query(`update public.profiles set status = 'active' where id = $1`, [
          ids.pendingA,
        ]),
      ),
    ).rejects.toThrow(/approval permission/i);
  });

  it("an active client cannot change their own account status", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `update public.profiles set status = 'deactivated' where id = $1`,
          [ids.clientA],
        ),
      ),
    ).rejects.toThrow(/approval permission/i);
  });

  it("client A CAN update their own display name", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`update public.profiles set full_name = 'New Name' where id = $1`, [
        ids.clientA,
      ]),
    );
    expect(rowCount).toBe(1);
  });
});

describe("assigned-staff scoping", () => {
  it("manager assigned to org A sees org A but not org B", async () => {
    const slugs = await actAs(user(ids.managerA), async (db) => {
      const { rows } = await db.query(`select slug from public.organizations`);
      return rows.map((row) => row.slug);
    });
    expect(slugs).toEqual(["fix1-org-a"]);
  });

  it("manager sees own profile plus members of assigned org only", async () => {
    const profileIds = await actAs(user(ids.managerA), async (db) => {
      const { rows } = await db.query(`select id from public.profiles order by id`);
      return rows.map((row) => row.id);
    });
    expect(profileIds).toContain(ids.managerA);
    expect(profileIds).toContain(ids.clientA);
    expect(profileIds).toContain(ids.pendingA);
    expect(profileIds).not.toContain(ids.clientB);
  });

  it("moderator assigned to org A cannot see org B memberships", async () => {
    const orgs = await actAs(user(ids.moderatorA), async (db) => {
      const { rows } = await db.query(
        `select distinct organization_id from public.organization_memberships`,
      );
      return rows.map((row) => row.organization_id);
    });
    expect(orgs).toEqual([ids.orgA]);
  });

  it("moderator cannot manage staff assignments", async () => {
    await expect(
      actAs(user(ids.moderatorA), (db) =>
        db.query(
          `insert into public.staff_assignments (organization_id, user_id)
           values ($1, $2)`,
          [ids.orgB, ids.moderatorA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("staff see only their own assignment rows", async () => {
    const rows = await actAs(user(ids.managerA), async (db) => {
      const result = await db.query(
        `select user_id from public.staff_assignments`,
      );
      return result.rows.map((row) => row.user_id);
    });
    expect(rows).toEqual([ids.managerA]);
  });
});

describe("administrator scope", () => {
  it("administrator sees both organizations", async () => {
    const slugs = await actAs(user(ids.admin), async (db) => {
      const { rows } = await db.query(
        `select slug from public.organizations where slug like 'fix1-%' order by slug`,
      );
      return rows.map((row) => row.slug);
    });
    expect(slugs).toEqual(["fix1-org-a", "fix1-org-b"]);
  });

  it("administrator sees every fixture profile", async () => {
    const profileIds = await actAs(user(ids.admin), async (db) => {
      const { rows } = await db.query(`select id from public.profiles`);
      return rows.map((row) => row.id);
    });
    for (const fixtureUser of [
      ids.admin,
      ids.managerA,
      ids.moderatorA,
      ids.clientA,
      ids.clientB,
      ids.pendingA,
    ]) {
      expect(profileIds).toContain(fixtureUser);
    }
  });

  it("administrator can read the audit log", async () => {
    const { rows } = await actAs(user(ids.admin), (db) =>
      db.query(`select count(*)::int as n from public.audit_logs`),
    );
    expect(rows[0].n).toBeGreaterThan(0);
  });

  it("audit log rejects direct inserts even from administrators", async () => {
    await expect(
      actAs(user(ids.admin), (db) =>
        db.query(
          `insert into public.audit_logs (action, entity_type) values ('forged', 'x')`,
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/i);
  });

  it("audit log rejects updates and deletes (append-only)", async () => {
    await expect(
      actAs(user(ids.admin), (db) =>
        db.query(`delete from public.audit_logs`),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("account lifecycle lockout", () => {
  it("pending member sees no organizations despite having a membership row", async () => {
    const { rows } = await actAs(user(ids.pendingA), (db) =>
      db.query(`select count(*)::int as n from public.organizations`),
    );
    expect(rows[0].n).toBe(0);
  });

  it("pending member sees no memberships", async () => {
    const { rows } = await actAs(user(ids.pendingA), (db) =>
      db.query(`select count(*)::int as n from public.organization_memberships`),
    );
    expect(rows[0].n).toBe(0);
  });

  it("pending member can still read their own profile (for the holding page)", async () => {
    const { rows } = await actAs(user(ids.pendingA), (db) =>
      db.query(`select status from public.profiles where id = $1`, [
        ids.pendingA,
      ]),
    );
    expect(rows[0]?.status).toBe("pending_approval");
  });

  it("pending member has no effective permissions", async () => {
    const { rows } = await actAs(user(ids.pendingA), (db) =>
      db.query(`select public.has_permission('documents.upload') as ok`),
    );
    expect(rows[0].ok).toBe(false);
  });
});
