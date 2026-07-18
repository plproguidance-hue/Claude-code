import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  closePool,
  createFixtures,
  getPool,
  superuser,
  user,
  type FixtureIds,
} from "./helpers";
import type { PoolClient } from "pg";

/**
 * Phase 6 proofs: ticket status flow, internal notes invisible to clients,
 * closed read-only, project-message participation, tenant isolation.
 */

let ids: FixtureIds;

async function as(client: PoolClient, uid: string) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: uid, role: "authenticated" }),
  ]);
}

beforeAll(async () => {
  ids = await createFixtures("8");
});

afterAll(async () => {
  await closePool();
});

describe("support tickets", () => {
  it("full flow: open → staff reply → internal note hidden → resolve → client reply reopens → close → read-only", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await as(client, ids.clientA);
      const created = await client.query(
        `insert into public.tickets (organization_id, department, subject, created_by)
         values ($1, 'order_support', 'Where is my order?', $2)
         returning id, ticket_number, status`,
        [ids.orgA, ids.clientA],
      );
      const ticketId = created.rows[0].id as string;
      expect(created.rows[0].ticket_number).toMatch(/^PG-TIC-\d{6}$/);

      await client.query(`select public.reply_ticket($1, 'Please advise')`, [
        ticketId,
      ]);
      let status = await client.query(
        `select status from public.tickets where id = $1`,
        [ticketId],
      );
      expect(status.rows[0].status).toBe("waiting_staff");

      // Clients cannot post internal notes.
      await client.query("savepoint s1");
      await expect(
        client.query(`select public.reply_ticket($1, 'sneaky', true)`, [
          ticketId,
        ]),
      ).rejects.toThrow(/staff-only/i);
      await client.query("rollback to s1");

      // Manager assigns, replies publicly + adds an internal note.
      await as(client, ids.managerA);
      await client.query(
        `select public.set_ticket_status($1, 'assigned', $2)`,
        [ticketId, ids.moderatorA],
      );
      await client.query(
        `select public.reply_ticket($1, 'We are on it')`,
        [ticketId],
      );
      await client.query(
        `select public.reply_ticket($1, 'internal: check with filing team', true)`,
        [ticketId],
      );
      status = await client.query(
        `select status, assigned_to from public.tickets where id = $1`,
        [ticketId],
      );
      expect(status.rows[0].status).toBe("waiting_client");
      expect(status.rows[0].assigned_to).toBe(ids.moderatorA);

      // Client sees the public reply but NOT the internal note.
      await as(client, ids.clientA);
      const clientView = await client.query(
        `select body from public.ticket_messages where ticket_id = $1 order by created_at`,
        [ticketId],
      );
      expect(clientView.rows.map((row) => row.body)).toEqual([
        "Please advise",
        "We are on it",
      ]);

      // Staff see everything.
      await as(client, ids.moderatorA);
      const staffView = await client.query(
        `select count(*)::int as n from public.ticket_messages where ticket_id = $1`,
        [ticketId],
      );
      expect(staffView.rows[0].n).toBe(3);

      // Manager resolves; client reply reopens.
      await as(client, ids.managerA);
      await client.query(`select public.set_ticket_status($1, 'resolved')`, [
        ticketId,
      ]);
      await as(client, ids.clientA);
      await client.query(
        `select public.reply_ticket($1, 'Still not fixed!')`,
        [ticketId],
      );
      status = await client.query(
        `select status from public.tickets where id = $1`,
        [ticketId],
      );
      expect(status.rows[0].status).toBe("reopened");

      // Moderators cannot close (tickets.close is manager+).
      await as(client, ids.moderatorA);
      await client.query("savepoint s2");
      await expect(
        client.query(`select public.set_ticket_status($1, 'closed')`, [
          ticketId,
        ]),
      ).rejects.toThrow(/tickets\.close/i);
      await client.query("rollback to s2");

      // Manager closes → replies rejected → client reopens.
      await as(client, ids.managerA);
      await client.query(`select public.set_ticket_status($1, 'closed')`, [
        ticketId,
      ]);
      await as(client, ids.clientA);
      await client.query("savepoint s3");
      await expect(
        client.query(`select public.reply_ticket($1, 'hello?')`, [ticketId]),
      ).rejects.toThrow(/read-only/i);
      await client.query("rollback to s3");
      await client.query(`select public.set_ticket_status($1, 'reopened')`, [
        ticketId,
      ]);
      status = await client.query(
        `select status, closed_at from public.tickets where id = $1`,
        [ticketId],
      );
      expect(status.rows[0].status).toBe("reopened");
      expect(status.rows[0].closed_at).toBeNull();
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("client B cannot see or reply to org A tickets", async () => {
    const ticketId = await superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.tickets (organization_id, department, subject, created_by)
         values ($1, 'sales', 'Private thread', $2) returning id`,
        [ids.orgA, ids.clientA],
      );
      return rows[0].id as string;
    });

    const { rows } = await actAs(user(ids.clientB), (db) =>
      db.query(`select count(*)::int as n from public.tickets where id = $1`, [
        ticketId,
      ]),
    );
    expect(rows[0].n).toBe(0);

    await expect(
      actAs(user(ids.clientB), (db) =>
        db.query(`select public.reply_ticket($1, 'intruding')`, [ticketId]),
      ),
    ).rejects.toThrow(/not a member/i);
  });
});

describe("project messages", () => {
  let projectA: string;

  beforeAll(async () => {
    projectA = await superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.projects (organization_id, service_id, requested_by)
         select $1, s.id, $2 from public.services s where s.slug = 'ein-application'
         returning id`,
        [ids.orgA, ids.clientA],
      );
      return rows[0].id as string;
    });
  });

  it("members and staff post; internal notes hidden from clients; outsiders blocked", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await as(client, ids.clientA);
      await client.query(
        `insert into public.project_messages (project_id, author_id, body)
         values ($1, $2, 'How is it going?')`,
        [projectA, ids.clientA],
      );

      // Clients cannot post internal notes.
      await client.query("savepoint s1");
      await expect(
        client.query(
          `insert into public.project_messages (project_id, author_id, body, is_internal)
           values ($1, $2, 'sneaky internal', true)`,
          [projectA, ids.clientA],
        ),
      ).rejects.toThrow(/row-level security/i);
      await client.query("rollback to s1");

      await as(client, ids.moderatorA);
      await client.query(
        `insert into public.project_messages (project_id, author_id, body)
         values ($1, $2, 'Filed today')`,
        [projectA, ids.moderatorA],
      );
      await client.query(
        `insert into public.project_messages (project_id, author_id, body, is_internal)
         values ($1, $2, 'internal: double-check state fee', true)`,
        [projectA, ids.moderatorA],
      );

      await as(client, ids.clientA);
      const clientView = await client.query(
        `select body from public.project_messages where project_id = $1 order by created_at`,
        [projectA],
      );
      expect(clientView.rows.map((row) => row.body)).toEqual([
        "How is it going?",
        "Filed today",
      ]);

      await as(client, ids.managerA);
      const staffView = await client.query(
        `select count(*)::int as n from public.project_messages where project_id = $1`,
        [projectA],
      );
      expect(staffView.rows[0].n).toBe(3);

      // Client B (different org) sees nothing and cannot post.
      await as(client, ids.clientB);
      const foreign = await client.query(
        `select count(*)::int as n from public.project_messages where project_id = $1`,
        [projectA],
      );
      expect(foreign.rows[0].n).toBe(0);
      await client.query("savepoint s2");
      await expect(
        client.query(
          `insert into public.project_messages (project_id, author_id, body)
           values ($1, $2, 'outsider')`,
          [projectA, ids.clientB],
        ),
      ).rejects.toThrow(/row-level security/i);
      await client.query("rollback to s2");
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
