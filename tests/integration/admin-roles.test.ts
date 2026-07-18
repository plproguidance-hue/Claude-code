import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  closePool,
  createFixtures,
  user,
  type FixtureIds,
} from "./helpers";

/** Phase 8 proofs: role and assignment management authority. */

let ids: FixtureIds;

beforeAll(async () => {
  ids = await createFixtures("a");
});

afterAll(async () => {
  await closePool();
});

describe("role management", () => {
  it("administrators can change a user's role (audited by trigger)", async () => {
    await actAs(user(ids.admin), async (db) => {
      const { rowCount } = await db.query(
        `update public.profiles set role = 'moderator' where id = $1`,
        [ids.clientA],
      );
      expect(rowCount).toBe(1);

      const audit = await db.query(
        `select count(*)::int as n from public.audit_logs
          where action = 'user.role_changed' and entity_id = $1`,
        [ids.clientA],
      );
      expect(audit.rows[0].n).toBe(1);
    });
  });

  it("managers cannot change roles (trigger requires users.roles.manage)", async () => {
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `update public.profiles set role = 'administrator' where id = $1`,
          [ids.clientA],
        ),
      ),
    ).rejects.toThrow(/users\.roles\.manage/i);
  });

  it("managers cannot manage staff assignments", async () => {
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `insert into public.staff_assignments (organization_id, user_id)
           values ($1, $2)`,
          [ids.orgB, ids.managerA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("administrators can add and remove staff assignments", async () => {
    await actAs(user(ids.admin), async (db) => {
      const inserted = await db.query(
        `insert into public.staff_assignments (organization_id, user_id)
         values ($1, $2) returning id`,
        [ids.orgB, ids.moderatorA],
      );
      expect(inserted.rowCount).toBe(1);

      const removed = await db.query(
        `delete from public.staff_assignments where id = $1`,
        [inserted.rows[0].id],
      );
      expect(removed.rowCount).toBe(1);
    });
  });
});
