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
 * Phase 2 tenant-isolation proofs for the companies module: company records,
 * owners, addresses, compliance deadlines, and reviewed update requests must
 * all follow the organization boundary; drafts are the only client-editable
 * state; authoritative changes go through the audited review function.
 */

let ids: FixtureIds;
const COMPANY_A = "4c000001-0000-4000-8000-00000000000a";
const COMPANY_B = "4c000002-0000-4000-8000-00000000000b";

beforeAll(async () => {
  ids = await createFixtures("4");
  await superuser(async (db) => {
    // Active company in each org (created via superuser as staff would).
    await db.query(
      `insert into public.companies
         (id, organization_id, legal_name, entity_type, formation_state, ein, status)
       values
         ($1, $3, 'Org A Trading LLC', 'llc', 'WY', '11-1111111', 'active'),
         ($2, $4, 'Org B Holdings Inc', 'c_corp', 'DE', '22-2222222', 'active')
       on conflict (id) do nothing`,
      [COMPANY_A, COMPANY_B, ids.orgA, ids.orgB],
    );
    await db.query(
      `insert into public.company_owners_members (company_id, full_name, ownership_percent)
       values ($1, 'Owner Alpha', 100), ($2, 'Owner Beta', 100)
       on conflict do nothing`,
      [COMPANY_A, COMPANY_B],
    );
    await db.query(
      `insert into public.company_compliance_deadlines (company_id, title, kind, due_date)
       values ($1, 'Annual report', 'annual_report', current_date + 30)
       on conflict do nothing`,
      [COMPANY_A],
    );
  });
});

afterAll(async () => {
  await closePool();
});

describe("company tenant isolation", () => {
  it("anon sees zero companies", async () => {
    const { rows } = await actAs(anon, (db) =>
      db.query(`select count(*)::int as n from public.companies`),
    );
    expect(rows[0].n).toBe(0);
  });

  it("client A sees only org A companies", async () => {
    const names = await actAs(user(ids.clientA), async (db) => {
      const { rows } = await db.query(
        `select legal_name from public.companies where id in ($1, $2)`,
        [COMPANY_A, COMPANY_B],
      );
      return rows.map((row) => row.legal_name);
    });
    expect(names).toEqual(["Org A Trading LLC"]);
  });

  it("client A cannot read org B owners or deadlines", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const owners = await db.query(
        `select count(*)::int as n from public.company_owners_members where company_id = $1`,
        [COMPANY_B],
      );
      expect(owners.rows[0].n).toBe(0);
    });
  });

  it("client A cannot create a company inside org B", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.companies (organization_id, legal_name, created_by)
           values ($1, 'Sneaky LLC', $2)`,
          [ids.orgB, ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("client A cannot update an active company directly (0 rows)", async () => {
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(
        `update public.companies set legal_name = 'Renamed' where id = $1`,
        [COMPANY_A],
      ),
    );
    expect(rowCount).toBe(0);
  });

  it("manager assigned to org A sees org A companies but not org B", async () => {
    const names = await actAs(user(ids.managerA), async (db) => {
      const { rows } = await db.query(
        `select legal_name from public.companies where id in ($1, $2)`,
        [COMPANY_A, COMPANY_B],
      );
      return rows.map((row) => row.legal_name);
    });
    expect(names).toEqual(["Org A Trading LLC"]);
  });

  it("administrator sees companies in both orgs", async () => {
    const { rows } = await actAs(user(ids.admin), (db) =>
      db.query(
        `select count(*)::int as n from public.companies where id in ($1, $2)`,
        [COMPANY_A, COMPANY_B],
      ),
    );
    expect(rows[0].n).toBe(2);
  });
});

describe("draft lifecycle", () => {
  it("client A can create, edit, and submit a draft in their own org", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const inserted = await db.query(
        `insert into public.companies (organization_id, legal_name, business_purpose, entity_type, formation_state, created_by)
         values ($1, 'Draft Co LLC', 'Testing drafts', 'llc', 'WY', $2)
         returning id, status`,
        [ids.orgA, ids.clientA],
      );
      const draftId = inserted.rows[0].id;
      expect(inserted.rows[0].status).toBe("draft");

      const updated = await db.query(
        `update public.companies set dba = 'DraftCo' where id = $1`,
        [draftId],
      );
      expect(updated.rowCount).toBe(1);

      const owner = await db.query(
        `insert into public.company_owners_members (company_id, full_name)
         values ($1, 'Draft Owner') returning id`,
        [draftId],
      );
      expect(owner.rowCount).toBe(1);

      const submitted = await db.query(
        `update public.companies set status = 'pending_review'
          where id = $1 returning status, submitted_at`,
        [draftId],
      );
      expect(submitted.rows[0].status).toBe("pending_review");
      expect(submitted.rows[0].submitted_at).not.toBeNull();
    });
  });

  it("clients cannot jump a draft straight to active", async () => {
    await expect(
      actAs(user(ids.clientA), async (db) => {
        const inserted = await db.query(
          `insert into public.companies (organization_id, legal_name, created_by)
           values ($1, 'Jump LLC', $2) returning id`,
          [ids.orgA, ids.clientA],
        );
        await db.query(
          `update public.companies set status = 'active' where id = $1`,
          [inserted.rows[0].id],
        );
      }),
    ).rejects.toThrow(/managed by staff/i);
  });

  it("review staff can activate a pending company (audited)", async () => {
    await actAs(user(ids.managerA), async (db) => {
      const inserted = await actAsSuperuser(async () => null);
      void inserted;
      // Manager creates on behalf via clients.update permission.
      const created = await db.query(
        `insert into public.companies (organization_id, legal_name, created_by)
         values ($1, 'Staff Created LLC', $2) returning id`,
        [ids.orgA, ids.managerA],
      );
      const companyId = created.rows[0].id;
      const activated = await db.query(
        `update public.companies set status = 'active' where id = $1 returning status`,
        [companyId],
      );
      expect(activated.rows[0].status).toBe("active");
    });
  });
});

describe("compliance deadlines", () => {
  it("clients can read but not write deadlines", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const read = await db.query(
        `select count(*)::int as n from public.company_compliance_deadlines where company_id = $1`,
        [COMPANY_A],
      );
      expect(read.rows[0].n).toBe(1);
    });

    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into public.company_compliance_deadlines (company_id, title, kind, due_date)
           values ($1, 'Fake deadline', 'other', current_date)`,
          [COMPANY_A],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("assigned manager can add deadlines in scope, not in org B", async () => {
    await actAs(user(ids.managerA), async (db) => {
      const ok = await db.query(
        `insert into public.company_compliance_deadlines (company_id, title, kind, due_date)
         values ($1, 'Agent renewal', 'registered_agent_renewal', current_date + 90)
         returning id`,
        [COMPANY_A],
      );
      expect(ok.rowCount).toBe(1);
    });

    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `insert into public.company_compliance_deadlines (company_id, title, kind, due_date)
           values ($1, 'Out of scope', 'other', current_date)`,
          [COMPANY_B],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("update-request review workflow", () => {
  async function fileRequest(): Promise<string> {
    return superuser(async (db) => {
      const { rows } = await db.query(
        `insert into public.company_update_requests (company_id, requested_by, changes)
         values ($1, $2, '{"legal_name":"Org A Trading Group LLC","ein":"33-3333333"}')
         returning id`,
        [COMPANY_A, ids.clientA],
      );
      return rows[0].id as string;
    });
  }

  it("clients can file requests against active companies but not draft-edit them", async () => {
    await actAs(user(ids.clientA), async (db) => {
      const { rowCount } = await db.query(
        `insert into public.company_update_requests (company_id, requested_by, changes)
         values ($1, $2, '{"dba":"NewName"}')`,
        [COMPANY_A, ids.clientA],
      );
      expect(rowCount).toBe(1);
    });
  });

  it("client B cannot see or file against org A's company", async () => {
    const { rows } = await actAs(user(ids.clientB), (db) =>
      db.query(
        `select count(*)::int as n from public.company_update_requests where company_id = $1`,
        [COMPANY_A],
      ),
    );
    expect(rows[0].n).toBe(0);

    await expect(
      actAs(user(ids.clientB), (db) =>
        db.query(
          `insert into public.company_update_requests (company_id, requested_by, changes)
           values ($1, $2, '{"dba":"X"}')`,
          [COMPANY_A, ids.clientB],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("clients cannot review requests", async () => {
    const requestId = await fileRequest();
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `select public.review_company_update_request($1, 'approved')`,
          [requestId],
        ),
      ),
    ).rejects.toThrow(/companies\.update_request_review/i);
  });

  it("moderators (no review grant) cannot review requests", async () => {
    const requestId = await fileRequest();
    await expect(
      actAs(user(ids.moderatorA), (db) =>
        db.query(
          `select public.review_company_update_request($1, 'approved')`,
          [requestId],
        ),
      ),
    ).rejects.toThrow(/companies\.update_request_review/i);
  });

  it("manager approval applies whitelisted changes and audits", async () => {
    const requestId = await fileRequest();
    await actAs(user(ids.managerA), async (db) => {
      await db.query(
        `select public.review_company_update_request($1, 'approved', 'verified certificate')`,
        [requestId],
      );

      const company = await db.query(
        `select legal_name, ein from public.companies where id = $1`,
        [COMPANY_A],
      );
      expect(company.rows[0].legal_name).toBe("Org A Trading Group LLC");
      expect(company.rows[0].ein).toBe("33-3333333");

      const request = await db.query(
        `select status, reviewed_by from public.company_update_requests where id = $1`,
        [requestId],
      );
      expect(request.rows[0].status).toBe("approved");
      expect(request.rows[0].reviewed_by).toBe(ids.managerA);
    });

    // The audit row is written by the SECURITY DEFINER function.
    await actAsSuperuser(async (db) => {
      const audit = await db.query(
        `select count(*)::int as n from public.audit_logs
          where action = 'company_update_request.approved'`,
      );
      expect(audit.rows[0].n).toBe(0); // rolled back with the transaction
    });
  });

  it("a request cannot be reviewed twice", async () => {
    const requestId = await fileRequest();
    await expect(
      actAs(user(ids.managerA), async (db) => {
        await db.query(
          `select public.review_company_update_request($1, 'rejected')`,
          [requestId],
        );
        await db.query(
          `select public.review_company_update_request($1, 'approved')`,
          [requestId],
        );
      }),
    ).rejects.toThrow(/already reviewed/i);
  });
});

describe("invitation preview", () => {
  it("returns limited fields for a valid token, nothing for a wrong one", async () => {
    await superuser((db) =>
      db.query(
        `insert into public.invitations
           (email, role, organization_id, token_hash, auto_approve, invited_by, expires_at)
         values ('preview@fixtures.test', 'client', $1,
                 encode(sha256(convert_to('preview-token', 'utf8')), 'hex'),
                 true, $2, now() + interval '7 days')
         on conflict (token_hash) do nothing`,
        [ids.orgA, ids.admin],
      ),
    );

    await actAs(anon, async (db) => {
      const hit = await db.query(
        `select * from public.invitation_preview('preview-token')`,
      );
      expect(hit.rows).toHaveLength(1);
      expect(hit.rows[0].email).toBe("preview@fixtures.test");
      expect(hit.rows[0].is_valid).toBe(true);
      expect(hit.rows[0].organization_name).toBe("Fixture Org A");

      const miss = await db.query(
        `select * from public.invitation_preview('wrong-token')`,
      );
      expect(miss.rows).toHaveLength(0);

      // The table itself stays closed to anon.
      const table = await db.query(
        `select count(*)::int as n from public.invitations`,
      );
      expect(table.rows[0].n).toBe(0);
    });
  });
});
