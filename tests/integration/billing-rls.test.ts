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
 * Phase 5 financial proofs: quote lifecycle with recorded decisions,
 * idempotent conversion, invoice immutability after issue, atomic payment
 * approval, append-only wallet ledger, and tenant isolation throughout.
 */

let ids: FixtureIds;

async function as(client: PoolClient, uid: string) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: uid, role: "authenticated" }),
  ]);
}

/** Builds a sent quotation (1 version, $278 total) and returns its id. */
async function buildSentQuote(client: PoolClient): Promise<string> {
  await as(client, ids.managerA);
  const quote = await client.query(
    `insert into public.quotations (organization_id, title, status, created_by)
     values ($1, 'Bundle', 'draft', $2) returning id`,
    [ids.orgA, ids.managerA],
  );
  const quoteId = quote.rows[0].id as string;
  const version = await client.query(
    `insert into public.quotation_versions (quotation_id, version, created_by)
     values ($1, 1, $2) returning id`,
    [quoteId, ids.managerA],
  );
  await client.query(
    `insert into public.quotation_line_items
       (quotation_version_id, label, quantity, unit_price_cents)
     values ($1, 'LLC', 1, 19900), ($1, 'EIN', 1, 7900)`,
    [version.rows[0].id],
  );
  await client.query(`select public.send_quotation($1)`, [quoteId]);
  return quoteId;
}

beforeAll(async () => {
  ids = await createFixtures("7");
});

afterAll(async () => {
  await closePool();
});

describe("quotation lifecycle", () => {
  it("clients only see quotations once sent, never staff drafts", async () => {
    const draftId = await superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.quotations (organization_id, title, status, created_by)
         values ($1, 'Hidden draft', 'draft', $2) returning id`,
        [ids.orgA, ids.managerA],
      );
      return rows[0].id as string;
    });

    const client = await actAs(user(ids.clientA), (db) =>
      db.query(`select count(*)::int as n from public.quotations where id = $1`, [
        draftId,
      ]),
    );
    expect(client.rows[0].n).toBe(0);

    const manager = await actAs(user(ids.managerA), (db) =>
      db.query(`select count(*)::int as n from public.quotations where id = $1`, [
        draftId,
      ]),
    );
    expect(manager.rows[0].n).toBe(1);
  });

  it("full flow: send → accept (actor recorded) → convert once → issue → pay → paid", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const quoteId = await buildSentQuote(client);

      // Client B cannot decide org A's quote.
      await as(client, ids.clientB);
      await client.query("savepoint s1");
      await expect(
        client.query(`select public.decide_quotation($1, 'accept')`, [quoteId]),
      ).rejects.toThrow(/not a member/i);
      await client.query("rollback to s1");

      await as(client, ids.clientA);
      await client.query(
        `select public.decide_quotation($1, 'accept', 'go ahead')`,
        [quoteId],
      );
      const decided = await client.query(
        `select status, decided_by, decided_at from public.quotations where id = $1`,
        [quoteId],
      );
      expect(decided.rows[0].status).toBe("accepted");
      expect(decided.rows[0].decided_by).toBe(ids.clientA);
      expect(decided.rows[0].decided_at).not.toBeNull();

      // Clients cannot convert.
      await client.query("savepoint s2");
      await expect(
        client.query(`select public.convert_quotation($1)`, [quoteId]),
      ).rejects.toThrow(/quotations\.convert/i);
      await client.query("rollback to s2");

      await as(client, ids.managerA);
      const converted = await client.query(
        `select public.convert_quotation($1) as invoice_id`,
        [quoteId],
      );
      const invoiceId = converted.rows[0].invoice_id as string;
      expect(invoiceId).toBeTruthy();

      const invoice = await client.query(
        `select status, total_cents from public.invoices where id = $1`,
        [invoiceId],
      );
      expect(invoice.rows[0]).toEqual({ status: "draft", total_cents: 27800 });

      // Second conversion is rejected (idempotency).
      await client.query("savepoint s3");
      await expect(
        client.query(`select public.convert_quotation($1)`, [quoteId]),
      ).rejects.toThrow(/already been converted|only accepted/i);
      await client.query("rollback to s3");

      // Managers cannot issue (administrator permission).
      await client.query("savepoint s4");
      await expect(
        client.query(`select public.issue_invoice($1)`, [invoiceId]),
      ).rejects.toThrow(/invoices\.issue/i);
      await client.query("rollback to s4");

      await as(client, ids.admin);
      await client.query(`select public.issue_invoice($1)`, [invoiceId]);
      const issued = await client.query(
        `select status, total_cents, due_date from public.invoices where id = $1`,
        [invoiceId],
      );
      expect(issued.rows[0].status).toBe("sent");
      expect(issued.rows[0].total_cents).toBe(27800);
      expect(issued.rows[0].due_date).not.toBeNull();

      // Issued line items are frozen even for billing staff.
      await as(client, ids.managerA);
      await client.query("savepoint s5");
      await expect(
        client.query(
          `insert into public.invoice_line_items (invoice_id, label, unit_price_cents)
           values ($1, 'Sneaky extra', 100)`,
          [invoiceId],
        ),
      ).rejects.toThrow(/immutable/i);
      await client.query("rollback to s5");

      // Client submits proof; admin approves; invoice becomes paid.
      await as(client, ids.clientA);
      const payment = await client.query(
        `insert into public.payments
           (organization_id, invoice_id, method, amount_cents, reference, submitted_by)
         values ($1, $2, 'bank_transfer', 27800, 'TXN-1', $3) returning id`,
        [ids.orgA, invoiceId, ids.clientA],
      );
      const paymentId = payment.rows[0].id as string;

      // Clients cannot review payments.
      await client.query("savepoint s6");
      await expect(
        client.query(`select public.review_payment($1, 'approved')`, [paymentId]),
      ).rejects.toThrow(/payments\.review/i);
      await client.query("rollback to s6");

      await as(client, ids.admin);
      await client.query(
        `select public.review_payment($1, 'approved', 'verified')`,
        [paymentId],
      );
      const paid = await client.query(
        `select status, amount_paid_cents from public.invoices where id = $1`,
        [invoiceId],
      );
      expect(paid.rows[0]).toEqual({ status: "paid", amount_paid_cents: 27800 });

      // Double approval is rejected.
      await client.query("savepoint s7");
      await expect(
        client.query(`select public.review_payment($1, 'approved')`, [paymentId]),
      ).rejects.toThrow(/already decided/i);
      await client.query("rollback to s7");
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("expired quotations cannot be accepted", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const quoteId = await buildSentQuote(client);
      await client.query("set local role postgres");
      await client.query(
        `update public.quotations set valid_until = current_date - 1 where id = $1`,
        [quoteId],
      );
      await as(client, ids.clientA);
      await expect(
        client.query(`select public.decide_quotation($1, 'accept')`, [quoteId]),
      ).rejects.toThrow(/expired/i);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});

describe("wallet ledger", () => {
  it("approved top-up credits the ledger with a correct running balance; ledger is append-only", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await as(client, ids.clientA);
      const topup = await client.query(
        `insert into public.payments
           (organization_id, method, amount_cents, reference, submitted_by)
         values ($1, 'wallet_topup', 5000, 'TOPUP-1', $2) returning id`,
        [ids.orgA, ids.clientA],
      );
      await as(client, ids.admin);
      await client.query(`select public.review_payment($1, 'approved')`, [
        topup.rows[0].id,
      ]);

      const wallet = await client.query(
        `select balance_cents from public.wallet_accounts where organization_id = $1`,
        [ids.orgA],
      );
      expect(Number(wallet.rows[0].balance_cents)).toBe(5000);

      const ledger = await client.query(
        `select entry_type, amount_cents, balance_after_cents
           from public.wallet_ledger_entries`,
      );
      expect(ledger.rows).toHaveLength(1);
      expect(ledger.rows[0].entry_type).toBe("credit");
      expect(Number(ledger.rows[0].balance_after_cents)).toBe(5000);

      // Append-only: even administrators cannot update or delete entries.
      await client.query("savepoint s1");
      await expect(
        client.query(`delete from public.wallet_ledger_entries`),
      ).rejects.toThrow(/permission denied/i);
      await client.query("rollback to s1");

      // Client B sees nothing of org A's wallet.
      await as(client, ids.clientB);
      const foreign = await client.query(
        `select count(*)::int as n from public.wallet_ledger_entries`,
      );
      expect(foreign.rows[0].n).toBe(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});

describe("invoice tenant isolation", () => {
  it("client B never sees org A invoices; clients never see drafts", async () => {
    const { draftId, issuedId } = await superuser(async (db) => {
      const draft = await db.query(
        `insert into public.invoices (organization_id, created_by)
         values ($1, $2) returning id`,
        [ids.orgA, ids.managerA],
      );
      const issued = await db.query(
        `insert into public.invoices (organization_id, created_by)
         values ($1, $2) returning id`,
        [ids.orgA, ids.managerA],
      );
      await db.query(
        `insert into public.invoice_line_items (invoice_id, label, unit_price_cents)
         values ($1, 'Service', 10000)`,
        [issued.rows[0].id],
      );
      await db.query(
        `update public.invoices
            set status = 'sent', total_cents = 10000, issue_date = current_date
          where id = $1`,
        [issued.rows[0].id],
      );
      return {
        draftId: draft.rows[0].id as string,
        issuedId: issued.rows[0].id as string,
      };
    });

    const clientView = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `select id from public.invoices where id in ($1, $2)`,
        [draftId, issuedId],
      );
      return rows.map((row) => row.id);
    });
    expect(clientView).toEqual([issuedId]);

    const foreign = await actAs(user(ids.clientB), (db) =>
      db.query(`select count(*)::int as n from public.invoices where id = $1`, [
        issuedId,
      ]),
    );
    expect(foreign.rows[0].n).toBe(0);
  });
});
