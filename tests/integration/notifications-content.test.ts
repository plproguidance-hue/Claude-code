import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  closePool,
  createFixtures,
  getPool,
  user,
  type FixtureIds,
} from "./helpers";
import type { PoolClient } from "pg";

/**
 * Phase 7 proofs: event-driven notifications, mandatory security email in
 * the outbox, own-only notification access, announcement permission, and
 * draft/publish content visibility.
 */

let ids: FixtureIds;

async function as(client: PoolClient, uid: string) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: uid, role: "authenticated" }),
  ]);
}

beforeAll(async () => {
  ids = await createFixtures("9");
});

afterAll(async () => {
  await closePool();
});

describe("event-driven notifications", () => {
  it("registration approval notifies the user and queues a security email exactly once", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const APPLICANT = "90000031-0000-4000-8000-000000000031";
      await client.query(
        `insert into auth.users (id, email) values ($1, '9-newuser@fixtures.test')`,
        [APPLICANT],
      );

      await as(client, ids.admin);
      await client.query(
        `select public.approve_registration($1, 'approved')`,
        [APPLICANT],
      );

      await client.query("set local role postgres");
      const notification = await client.query(
        `select type, title from public.notifications where user_id = $1`,
        [APPLICANT],
      );
      expect(notification.rows[0].type).toBe("security");

      const outbox = await client.query(
        `select count(*)::int as n from public.email_outbox
          where idempotency_key = 'registration-approved:' || $1`,
        [APPLICANT],
      );
      expect(outbox.rows[0].n).toBe(1);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("issuing an invoice notifies org members; users see only their own notifications", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await as(client, ids.managerA);
      const invoice = await client.query(
        `insert into public.invoices (organization_id, created_by)
         values ($1, $2) returning id`,
        [ids.orgA, ids.managerA],
      );
      await client.query(
        `insert into public.invoice_line_items (invoice_id, label, unit_price_cents)
         values ($1, 'Service', 10000)`,
        [invoice.rows[0].id],
      );
      await as(client, ids.admin);
      await client.query(`select public.issue_invoice($1)`, [
        invoice.rows[0].id,
      ]);

      // Org A's client got a billing notification…
      await as(client, ids.clientA);
      const mine = await client.query(
        `select count(*)::int as n from public.notifications
          where type = 'billing' and user_id = $1`,
        [ids.clientA],
      );
      expect(mine.rows[0].n).toBeGreaterThan(0);

      // …and client B sees nothing (not their org, not their rows).
      await as(client, ids.clientB);
      const theirs = await client.query(
        `select count(*)::int as n from public.notifications where type = 'billing'`,
      );
      expect(theirs.rows[0].n).toBe(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("users can mark only their own notifications read", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query(
        `select public.notify_user($1, 'announcement', 'For A only')`,
        [ids.clientA],
      );

      await as(client, ids.clientB);
      const foreignUpdate = await client.query(
        `update public.notifications set read_at = now() where user_id = $1`,
        [ids.clientA],
      );
      expect(foreignUpdate.rowCount).toBe(0);

      await as(client, ids.clientA);
      const ownUpdate = await client.query(
        `update public.notifications set read_at = now()
          where user_id = $1 and read_at is null`,
        [ids.clientA],
      );
      expect(ownUpdate.rowCount).toBeGreaterThan(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("announcements require notifications.send", async () => {
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `select public.send_org_announcement($1, 'Unauthorized blast')`,
          [ids.orgA],
        ),
      ),
    ).rejects.toThrow(/notifications\.send/i);

    const client = await getPool().connect();
    try {
      await client.query("begin");
      await as(client, ids.admin);
      await client.query(
        `select public.send_org_announcement($1, 'Maintenance window', 'Sunday 02:00 UTC')`,
        [ids.orgA],
      );
      await as(client, ids.clientA);
      const { rows } = await client.query(
        `select count(*)::int as n from public.notifications
          where type = 'announcement' and title = 'Maintenance window'`,
      );
      expect(rows[0].n).toBe(1);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});

describe("content visibility", () => {
  it("published help articles are readable; drafts only for content managers", async () => {
    const draftId = await (async () => {
      const client = await getPool().connect();
      try {
        // Create a draft as admin (content.manage) and COMMIT so both
        // sessions can see the fixture; clean up after.
        await client.query("begin");
        await as(client, ids.admin);
        const { rows } = await client.query(
          `insert into public.help_articles (category_id, title, slug, body, is_published)
           select id, 'Draft article', 'draft-article-9', 'wip', false
             from public.help_categories limit 1
           returning id`,
        );
        await client.query("commit");
        return rows[0].id as string;
      } finally {
        client.release();
      }
    })();

    try {
      const clientView = await actAs(user(ids.clientA), (db) =>
        db.query(
          `select count(*)::int as n from public.help_articles where id = $1`,
          [draftId],
        ),
      );
      expect(clientView.rows[0].n).toBe(0);

      const published = await actAs(user(ids.clientA), (db) =>
        db.query(
          `select count(*)::int as n from public.help_articles where is_published`,
        ),
      );
      expect(published.rows[0].n).toBeGreaterThanOrEqual(8);

      const adminView = await actAs(user(ids.admin), (db) =>
        db.query(
          `select count(*)::int as n from public.help_articles where id = $1`,
          [draftId],
        ),
      );
      expect(adminView.rows[0].n).toBe(1);
    } finally {
      const { superuser } = await import("./helpers");
      await superuser((db) =>
        db.query(`delete from public.help_articles where id = $1`, [draftId]),
      );
    }
  });

  it("clients cannot modify content; outbox is hidden from non-managers", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(`update public.help_articles set title = 'Hacked'`),
    );
    expect(rowCount).toBe(0);

    const outbox = await actAs(user(ids.clientA), (db) =>
      db.query(`select count(*)::int as n from public.email_outbox`),
    );
    expect(outbox.rows[0].n).toBe(0);
  });
});
