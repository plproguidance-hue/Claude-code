import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  actAsSuperuser,
  anon,
  closePool,
  createFixtures,
  superuser,
  user,
  type FixtureIds,
} from "./helpers";

/**
 * Phase 3 proofs: catalogue visibility, order creation scoping, the audited
 * status machine (validity + permissions + staff-only history), and the
 * versioned data-request lifecycle — all under the tenant boundary.
 */

let ids: FixtureIds;
let publishedServiceId: string;
let unpublishedServiceId: string;
let projectA: string;

beforeAll(async () => {
  ids = await createFixtures("5");
  await superuser(async (db) => {
    const service = await db.query(
      `select id from public.services where slug = 'ein-application'`,
    );
    publishedServiceId = service.rows[0].id as string;

    const hidden = await db.query(
      `insert into public.services
         (category_id, name, slug, summary, price_cents, is_published)
       select category_id, 'Hidden Test Service', 'hidden-test-service',
              'Not yet published', 12300, false
         from public.services where slug = 'ein-application'
       on conflict (slug) do update set is_published = false
       returning id`,
    );
    unpublishedServiceId = hidden.rows[0].id as string;

    const project = await db.query(
      `insert into public.projects (organization_id, service_id, requested_by)
       values ($1, $2, $3)
       returning id`,
      [ids.orgA, publishedServiceId, ids.clientA],
    );
    projectA = project.rows[0].id as string;
  });
});

afterAll(async () => {
  await closePool();
});

describe("catalogue visibility", () => {
  it("anon sees no services at all", async () => {
    const { rows } = await actAs(anon, (db) =>
      db.query(`select count(*)::int as n from public.services`),
    );
    expect(rows[0].n).toBe(0);
  });

  it("clients see published services but never unpublished ones", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const published = await db.query(
        `select count(*)::int as n from public.services where id = $1`,
        [publishedServiceId],
      );
      expect(published.rows[0].n).toBe(1);

      const hidden = await db.query(
        `select count(*)::int as n from public.services where id = $1`,
        [unpublishedServiceId],
      );
      expect(hidden.rows[0].n).toBe(0);
    });
  });

  it("administrators see unpublished services", async () => {
    const { rows } = await actAs(user(ids.admin), (db) =>
      db.query(`select count(*)::int as n from public.services where id = $1`, [
        unpublishedServiceId,
      ]),
    );
    expect(rows[0].n).toBe(1);
  });

  it("clients cannot modify catalogue prices (0 rows)", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`update public.services set price_cents = 1 where id = $1`, [
        publishedServiceId,
      ]),
    );
    expect(rowCount).toBe(0);
  });
});

describe("order creation", () => {
  it("client A orders a published service into their own org (numbered, historied)", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `insert into public.projects (organization_id, service_id, requested_by)
         values ($1, $2, $3)
         returning order_number, status, id`,
        [ids.orgA, publishedServiceId, ids.clientA],
      );
      expect(rows[0].order_number).toMatch(/^PG-ORD-\d{6}$/);
      expect(rows[0].status).toBe("order_submitted");

      const history = await db.query(
        `select count(*)::int as n from public.project_status_history
          where project_id = $1`,
        [rows[0].id],
      );
      expect(history.rows[0].n).toBe(1);
    });
  });

  it("client A cannot order into org B", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.projects (organization_id, service_id, requested_by)
           values ($1, $2, $3)`,
          [ids.orgB, publishedServiceId, ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("clients cannot order unpublished services", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.projects (organization_id, service_id, requested_by)
           values ($1, $2, $3)`,
          [ids.orgA, unpublishedServiceId, ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("client B cannot see org A's project", async () => {
    const { rows } = await actAs(user(ids.clientB), (db) =>
      db.query(`select count(*)::int as n from public.projects where id = $1`, [
        projectA,
      ]),
    );
    expect(rows[0].n).toBe(0);
  });
});

describe("status machine", () => {
  it("clients cannot call transition_project", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(`select public.transition_project($1, 'processing')`, [
          projectA,
        ]),
      ),
    ).rejects.toThrow(/projects\.transition/i);
  });

  it("assigned moderator makes a valid transition with an audited history row", async () => {
    await actAs(user(ids.moderatorA), async (db) => {
      await db.query(
        `select public.transition_project($1, 'processing', 'started work')`,
        [projectA],
      );
      const project = await db.query(
        `select status from public.projects where id = $1`,
        [projectA],
      );
      expect(project.rows[0].status).toBe("processing");

      const history = await db.query(
        `select to_status, note from public.project_status_history
          where project_id = $1 order by created_at desc limit 1`,
        [projectA],
      );
      expect(history.rows[0]).toEqual({
        to_status: "processing",
        note: "started work",
      });
    });
  });

  it("invalid transitions are rejected", async () => {
    await expect(
      actAs(user(ids.moderatorA), (db) =>
        db.query(
          `select public.transition_project($1, 'waiting_for_approval')`,
          [projectA],
        ),
      ),
    ).rejects.toThrow(/invalid transition/i);
  });

  it("moderators cannot complete projects (projects.complete required)", async () => {
    await expect(
      actAs(user(ids.moderatorA), async (db) => {
        await db.query(`select public.transition_project($1, 'processing')`, [
          projectA,
        ]);
        await db.query(`select public.transition_project($1, 'completed')`, [
          projectA,
        ]);
      }),
    ).rejects.toThrow(/projects\.complete/i);
  });

  it("managers can complete from a valid predecessor", async () => {
    await actAs(user(ids.managerA), async (db) => {
      await db.query(`select public.transition_project($1, 'processing')`, [
        projectA,
      ]);
      await db.query(
        `select public.transition_project($1, 'completed', 'all done')`,
        [projectA],
      );
      const { rows } = await db.query(
        `select status, completed_at from public.projects where id = $1`,
        [projectA],
      );
      expect(rows[0].status).toBe("completed");
      expect(rows[0].completed_at).not.toBeNull();
    });
  });

  it("staff cannot bypass the machine with a direct status update", async () => {
    // There is no UPDATE policy on projects at all: the row is invisible to
    // direct updates (0 rows affected) and the status stays unchanged.
    await actAs(user(ids.managerA), async (db) => {
      const { rowCount } = await db.query(
        `update public.projects set status = 'completed' where id = $1`,
        [projectA],
      );
      expect(rowCount).toBe(0);

      const { rows } = await db.query(
        `select status from public.projects where id = $1`,
        [projectA],
      );
      expect(rows[0].status).toBe("order_submitted");
    });
  });

  it("staff-only history notes are hidden from clients but visible to staff", async () => {
    await superuser(async (db) => {
      // Plant a staff-only entry via the definer path (as transition would).
      await db.query(
        `insert into public.project_status_history
           (project_id, actor_id, from_status, to_status, note, client_visible)
         values ($1, $2, 'processing', 'on_hold', 'internal: waiting on vendor', false)`,
        [projectA, ids.managerA],
      );
    });

    const clientVisible = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `select count(*)::int as n from public.project_status_history
          where project_id = $1 and client_visible = false`,
        [projectA],
      );
      return rows[0].n as number;
    });
    expect(clientVisible).toBe(0);

    const staffVisible = await actAs(user(ids.managerA), async (db) => {
      const { rows } = await db.query(
        `select count(*)::int as n from public.project_status_history
          where project_id = $1 and client_visible = false`,
        [projectA],
      );
      return rows[0].n as number;
    });
    expect(staffVisible).toBeGreaterThan(0);
  });

  it("unassigned staff cannot transition projects in other orgs", async () => {
    const projectB = await superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.projects (organization_id, service_id, requested_by)
         values ($1, $2, $3) returning id`,
        [ids.orgB, publishedServiceId, ids.clientB],
      );
      return rows[0].id as string;
    });

    await expect(
      actAs(user(ids.moderatorA), (db) =>
        db.query(`select public.transition_project($1, 'processing')`, [
          projectB,
        ]),
      ),
    ).rejects.toThrow(/no access to this organization/i);
  });
});

describe("data-request lifecycle", () => {
  async function createRequest(): Promise<string> {
    return superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.data_requests
           (organization_id, project_id, title, created_by)
         values ($1, $2, 'Provide formation details', $3)
         returning id`,
        [ids.orgA, projectA, ids.managerA],
      );
      return rows[0].id as string;
    });
  }

  it("clients cannot create data requests", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.data_requests (organization_id, title, created_by)
           values ($1, 'Self request', $2)`,
          [ids.orgA, ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("full lifecycle: submit → reject → resubmit (versioned) → approve", async () => {
    const requestId = await createRequest();

    await actAs(user(ids.clientA), (db) =>
      db.query(`select public.submit_data_request($1, 'First answer')`, [
        requestId,
      ]),
    );

    // Each actAs rolls back, so replay the chain inside one connection to
    // observe the full lifecycle atomically.
    const { getPool } = await import("./helpers");
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const as = async (uid: string) => {
        await client.query("set local role authenticated");
        await client.query(
          "select set_config('request.jwt.claims', $1, true)",
          [JSON.stringify({ sub: uid, role: "authenticated" })],
        );
      };

      await as(ids.clientA);
      await client.query(`select public.submit_data_request($1, 'v1 answer')`, [
        requestId,
      ]);

      await as(ids.managerA);
      await client.query(
        `select public.review_data_request($1, 'rejected', 'Please add the EIN')`,
        [requestId],
      );
      let request = await client.query(
        `select status, rejection_reason from public.data_requests where id = $1`,
        [requestId],
      );
      expect(request.rows[0].status).toBe("rejected_changes_required");
      expect(request.rows[0].rejection_reason).toBe("Please add the EIN");

      await as(ids.clientA);
      await client.query(
        `select public.submit_data_request($1, 'v2 answer with EIN')`,
        [requestId],
      );

      const versions = await client.query(
        `select version, body from public.data_request_submissions
          where request_id = $1 order by version`,
        [requestId],
      );
      expect(versions.rows).toHaveLength(2);
      expect(versions.rows[0].body).toBe("v1 answer");
      expect(versions.rows[1].body).toBe("v2 answer with EIN");

      await as(ids.managerA);
      await client.query(`select public.review_data_request($1, 'approved')`, [
        requestId,
      ]);
      request = await client.query(
        `select status, reviewed_by from public.data_requests where id = $1`,
        [requestId],
      );
      expect(request.rows[0].status).toBe("approved");
      expect(request.rows[0].reviewed_by).toBe(ids.managerA);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("client B cannot see or submit to org A's request", async () => {
    const requestId = await createRequest();

    const { rows } = await actAs(user(ids.clientB), (db) =>
      db.query(
        `select count(*)::int as n from public.data_requests where id = $1`,
        [requestId],
      ),
    );
    expect(rows[0].n).toBe(0);

    await expect(
      actAs(user(ids.clientB), (db) =>
        db.query(`select public.submit_data_request($1, 'intruder')`, [
          requestId,
        ]),
      ),
    ).rejects.toThrow(/not a member/i);
  });

  it("moderators (no requests.review) cannot review", async () => {
    const requestId = await createRequest();
    await expect(
      actAs(user(ids.moderatorA), async (db) => {
        // Submit first so the request is reviewable at all.
        await actAsSuperuser(async () => null);
        await db.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: ids.clientA, role: "authenticated" }),
        ]);
        await db.query(`select public.submit_data_request($1, 'answer')`, [
          requestId,
        ]);
        await db.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: ids.moderatorA, role: "authenticated" }),
        ]);
        await db.query(`select public.review_data_request($1, 'approved')`, [
          requestId,
        ]);
      }),
    ).rejects.toThrow(/requests\.review/i);
  });
});
