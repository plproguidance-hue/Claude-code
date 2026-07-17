import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  actAsSuperuser,
  closePool,
  createFixtures,
  superuser,
  user,
  type FixtureIds,
} from "./helpers";

/**
 * Account-lifecycle proofs: signup trigger, pending-registration approval
 * via the audited `approve_registration()` RPC, and invitation pre-approval.
 */

let ids: FixtureIds;
const APPLICANT = "20000021-0000-4000-8000-000000000021";

beforeAll(async () => {
  ids = await createFixtures("2");
  await superuser((db) =>
    db.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, 'applicant@fixtures.test', '{"full_name":"Applicant"}')
       on conflict (id) do nothing`,
      [APPLICANT],
    ),
  );
});

afterAll(async () => {
  await closePool();
});

describe("signup trigger", () => {
  it("creates a pending client profile and an audit event", async () => {
    await actAsSuperuser(async (db) => {
      const { rows } = await db.query(
        `select role, status from public.profiles where id = $1`,
        [APPLICANT],
      );
      expect(rows[0]).toEqual({ role: "client", status: "pending_approval" });

      const audit = await db.query(
        `select count(*)::int as n from public.audit_logs
          where action = 'registration.submitted' and entity_id = $1`,
        [APPLICANT],
      );
      expect(audit.rows[0].n).toBe(1);
    });
  });
});

describe("approve_registration authorization", () => {
  it("clients cannot decide registrations", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(`select public.approve_registration($1, 'approved')`, [
          APPLICANT,
        ]),
      ),
    ).rejects.toThrow(/clients\.approve_registration/i);
  });

  it("moderators (no grant) cannot decide registrations", async () => {
    await expect(
      actAs(user(ids.moderatorA), (db) =>
        db.query(`select public.approve_registration($1, 'approved')`, [
          APPLICANT,
        ]),
      ),
    ).rejects.toThrow(/clients\.approve_registration/i);
  });

  it("anonymous callers cannot decide registrations", async () => {
    await expect(
      actAs({ kind: "anon" }, (db) =>
        db.query(`select public.approve_registration($1, 'approved')`, [
          APPLICANT,
        ]),
      ),
    ).rejects.toThrow(/clients\.approve_registration/i);
  });
});

describe("administrator decisions", () => {
  it("approval activates the account, stamps the decider, and audits", async () => {
    await actAs(user(ids.admin), async (db) => {
      await db.query(
        `select public.approve_registration($1, 'approved', 'verified by phone')`,
        [APPLICANT],
      );

      const { rows } = await db.query(
        `select status, decided_by, decision_note from public.profiles where id = $1`,
        [APPLICANT],
      );
      expect(rows[0].status).toBe("active");
      expect(rows[0].decided_by).toBe(ids.admin);
      expect(rows[0].decision_note).toBe("verified by phone");

      const audit = await db.query(
        `select count(*)::int as n from public.audit_logs
          where action = 'registration.approved' and entity_id = $1`,
        [APPLICANT],
      );
      expect(audit.rows[0].n).toBe(1);
    });
  });

  it("rejection marks the account rejected", async () => {
    // Previous test rolled back, so the applicant is pending again.
    await actAs(user(ids.admin), async (db) => {
      await db.query(`select public.approve_registration($1, 'rejected')`, [
        APPLICANT,
      ]);
      const { rows } = await db.query(
        `select status from public.profiles where id = $1`,
        [APPLICANT],
      );
      expect(rows[0].status).toBe("rejected");
    });
  });

  it("an already-decided registration cannot be decided twice", async () => {
    await expect(
      actAs(user(ids.admin), async (db) => {
        await db.query(`select public.approve_registration($1, 'approved')`, [
          APPLICANT,
        ]);
        await db.query(`select public.approve_registration($1, 'rejected')`, [
          APPLICANT,
        ]);
      }),
    ).rejects.toThrow(/already decided/i);
  });

  it("invalid decisions are rejected", async () => {
    await expect(
      actAs(user(ids.admin), (db) =>
        db.query(`select public.approve_registration($1, 'maybe')`, [APPLICANT]),
      ),
    ).rejects.toThrow(/invalid decision/i);
  });
});

describe("invitation pre-approval", () => {
  it("a matching auto-approve invitation activates the account and joins the org", async () => {
    const INVITED = "20000022-0000-4000-8000-000000000022";
    await actAsSuperuser(async (db) => {
      await db.query(
        `insert into public.invitations
           (email, role, organization_id, token_hash, auto_approve, invited_by, expires_at)
         values ('invited@fixtures.test', 'client', $1, 'test-hash-1', true, $2, now() + interval '7 days')`,
        [ids.orgA, ids.admin],
      );

      await db.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, 'invited@fixtures.test', '{"full_name":"Invited Person"}')`,
        [INVITED],
      );

      const profile = await db.query(
        `select status, role from public.profiles where id = $1`,
        [INVITED],
      );
      expect(profile.rows[0]).toEqual({ status: "active", role: "client" });

      const membership = await db.query(
        `select count(*)::int as n from public.organization_memberships
          where organization_id = $1 and user_id = $2`,
        [ids.orgA, INVITED],
      );
      expect(membership.rows[0].n).toBe(1);

      const invitation = await db.query(
        `select accepted_at from public.invitations where token_hash = 'test-hash-1'`,
      );
      expect(invitation.rows[0].accepted_at).not.toBeNull();
    });
  });

  it("expired invitations do not pre-approve", async () => {
    const LATE = "20000023-0000-4000-8000-000000000023";
    await actAsSuperuser(async (db) => {
      await db.query(
        `insert into public.invitations
           (email, role, organization_id, token_hash, auto_approve, invited_by, expires_at)
         values ('late@fixtures.test', 'client', $1, 'test-hash-2', true, $2, now() - interval '1 day')`,
        [ids.orgA, ids.admin],
      );
      await db.query(
        `insert into auth.users (id, email) values ($1, 'late@fixtures.test')`,
        [LATE],
      );
      const profile = await db.query(
        `select status from public.profiles where id = $1`,
        [LATE],
      );
      expect(profile.rows[0].status).toBe("pending_approval");
    });
  });
});
