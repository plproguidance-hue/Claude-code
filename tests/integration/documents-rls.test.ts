import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actAs,
  anon,
  closePool,
  createFixtures,
  superuser,
  user,
  type FixtureIds,
} from "./helpers";

/**
 * Phase 4 proofs: document tenant isolation, quarantine invisibility and
 * lifecycle, administrator-only release, review authorization, staff-only
 * visibility, and default-deny private storage.
 */

let ids: FixtureIds;
const CHECKSUM = "a".repeat(64);

async function createDocument(options?: {
  org?: string;
  uploader?: string;
  visibility?: "client" | "staff";
}): Promise<string> {
  return superuser(async (db) => {
    const { rows } = await db.query(
      `insert into public.documents
         (organization_id, title, visibility, uploaded_by)
       values ($1, 'Test document', $2, $3)
       returning id`,
      [
        options?.org ?? ids.orgA,
        options?.visibility ?? "client",
        options?.uploader ?? ids.clientA,
      ],
    );
    const documentId = rows[0].id as string;
    const org = options?.org ?? ids.orgA;
    await db.query(
      `insert into public.document_versions
         (document_id, version, file_name, mime_type, size_bytes,
          checksum_sha256, storage_path, uploaded_by)
       values ($1, 1, 'test.pdf', 'application/pdf', 1000, $2, $3, $4)`,
      [
        documentId,
        CHECKSUM,
        `org/${org}/${documentId}/v1/test.pdf`,
        options?.uploader ?? ids.clientA,
      ],
    );
    return documentId;
  });
}

async function versionIdOf(documentId: string): Promise<string> {
  return superuser(async (db) => {
    const { rows } = await db.query(
      `select id from public.document_versions where document_id = $1 limit 1`,
      [documentId],
    );
    return rows[0].id as string;
  });
}

beforeAll(async () => {
  ids = await createFixtures("6");
});

afterAll(async () => {
  await closePool();
});

describe("private storage default-deny", () => {
  it("the documents bucket exists and is private", async () => {
    await superuser(async (db) => {
      const { rows } = await db.query(
        `select public from storage.buckets where id = 'documents'`,
      );
      expect(rows[0]?.public).toBe(false);
    });
  });

  it("authenticated users cannot write to storage.objects", async () => {
    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(
          `insert into storage.objects (bucket_id, name, owner)
           values ('documents', 'org/x/direct.pdf', $1)`,
          [ids.clientA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("authenticated users and anon read zero storage objects", async () => {
    await superuser((db) =>
      db.query(
        `insert into storage.objects (bucket_id, name)
         values ('documents', 'org/seeded/hidden.pdf')
         on conflict do nothing`,
      ),
    );
    for (const actor of [anon, user(ids.clientA), user(ids.managerA)]) {
      const { rows } = await actAs(actor, (db) =>
        db.query(`select count(*)::int as n from storage.objects`),
      );
      expect(rows[0].n).toBe(0);
    }
  });
});

describe("document tenant isolation & visibility", () => {
  it("uploads start quarantined and versions bump the parent", async () => {
    const documentId = await createDocument();
    await superuser(async (db) => {
      const { rows } = await db.query(
        `select review_status, current_version from public.documents where id = $1`,
        [documentId],
      );
      expect(rows[0]).toEqual({
        review_status: "quarantined",
        current_version: 1,
      });
    });
  });

  it("client B cannot see org A documents at all", async () => {
    const documentId = await createDocument();
    const { rows } = await actAs(user(ids.clientB), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(rows[0].n).toBe(0);
  });

  it("quarantined docs are visible to the uploader and administrators, not other members or ordinary staff", async () => {
    const documentId = await createDocument({ uploader: ids.pendingA });
    // pendingA is inactive, so use clientA as a fellow member instead:
    const other = await actAs(user(ids.clientA), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(other.rows[0].n).toBe(0);

    const moderator = await actAs(user(ids.moderatorA), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(moderator.rows[0].n).toBe(0);

    const admin = await actAs(user(ids.admin), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(admin.rows[0].n).toBe(1);
  });

  it("staff-only documents are hidden from clients even when approved", async () => {
    const documentId = await createDocument({
      visibility: "staff",
      uploader: ids.managerA,
    });
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'clean')`, [versionId]),
    );

    const client = await actAs(user(ids.clientA), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(client.rows[0].n).toBe(0);

    const manager = await actAs(user(ids.managerA), (db) =>
      db.query(`select count(*)::int as n from public.documents where id = $1`, [
        documentId,
      ]),
    );
    expect(manager.rows[0].n).toBe(1);
  });

  it("clients cannot flip lifecycle fields directly (no update policy)", async () => {
    const documentId = await createDocument();
    const { rowCount } = await actAs(user(ids.clientA), (db) =>
      db.query(
        `update public.documents set review_status = 'approved' where id = $1`,
        [documentId],
      ),
    );
    expect(rowCount).toBe(0);
  });

  it("even review staff cannot bypass the lifecycle trigger with direct updates", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'clean')`, [versionId]),
    );
    // Manager passes the metadata-edit policy, but the protection trigger
    // rejects lifecycle-field changes outside the review functions.
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `update public.documents set review_status = 'approved' where id = $1`,
          [documentId],
        ),
      ),
    ).rejects.toThrow(/review functions/i);
  });

  it("deleting metadata requires documents.delete_metadata (admin only)", async () => {
    const documentId = await createDocument();
    const asManager = await actAs(user(ids.managerA), (db) =>
      db.query(`delete from public.documents where id = $1`, [documentId]),
    );
    expect(asManager.rowCount).toBe(0);

    const asAdmin = await actAs(user(ids.admin), (db) =>
      db.query(`delete from public.documents where id = $1`, [documentId]),
    );
    expect(asAdmin.rowCount).toBe(1);
  });
});

describe("scan and review lifecycle", () => {
  it("non-admin users cannot record scan results", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(`select public.mark_document_scanned($1, 'clean')`, [
          versionId,
        ]),
      ),
    ).rejects.toThrow(/recorded by the system/i);
  });

  it("a clean system scan promotes quarantine to pending_review", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'clean')`, [versionId]),
    );
    await superuser(async (db) => {
      const { rows } = await db.query(
        `select review_status from public.documents where id = $1`,
        [documentId],
      );
      expect(rows[0].review_status).toBe("pending_review");
    });
  });

  it("an 'unavailable' scan keeps the hard quarantine", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'unavailable')`, [
        versionId,
      ]),
    );
    await superuser(async (db) => {
      const { rows } = await db.query(
        `select review_status from public.documents where id = $1`,
        [documentId],
      );
      expect(rows[0].review_status).toBe("quarantined");
    });
  });

  it("only administrators release quarantined documents", async () => {
    const documentId = await createDocument();
    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(
          `select public.release_quarantined_document($1, 'release')`,
          [documentId],
        ),
      ),
    ).rejects.toThrow(/only administrators/i);

    await actAs(user(ids.admin), async (db) => {
      await db.query(
        `select public.release_quarantined_document($1, 'release', 'inspected manually')`,
        [documentId],
      );
      const { rows } = await db.query(
        `select review_status from public.documents where id = $1`,
        [documentId],
      );
      expect(rows[0].review_status).toBe("pending_review");
    });
  });

  it("review requires documents.review; rejection requires a reason; decisions are recorded", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'clean')`, [versionId]),
    );

    await expect(
      actAs(user(ids.clientA), (db) =>
        db.query(`select public.review_document($1, 'approved')`, [documentId]),
      ),
    ).rejects.toThrow(/documents\.review/i);

    await expect(
      actAs(user(ids.managerA), (db) =>
        db.query(`select public.review_document($1, 'rejected')`, [documentId]),
      ),
    ).rejects.toThrow(/requires a reason/i);

    await actAs(user(ids.managerA), async (db) => {
      await db.query(
        `select public.review_document($1, 'rejected', 'Document is expired')`,
        [documentId],
      );
      const doc = await db.query(
        `select review_status, review_note from public.documents where id = $1`,
        [documentId],
      );
      expect(doc.rows[0].review_status).toBe("rejected");
      expect(doc.rows[0].review_note).toBe("Document is expired");

      const reviews = await db.query(
        `select decision from public.document_reviews where document_id = $1`,
        [documentId],
      );
      expect(reviews.rows.map((row) => row.decision)).toContain("rejected");
    });
  });

  it("a resubmitted version returns the document to quarantine", async () => {
    const documentId = await createDocument();
    const versionId = await versionIdOf(documentId);
    await superuser((db) =>
      db.query(`select public.mark_document_scanned($1, 'clean')`, [versionId]),
    );

    await actAs(user(ids.clientA), async (db) => {
      await db.query(
        `insert into public.document_versions
           (document_id, version, file_name, mime_type, size_bytes,
            checksum_sha256, storage_path, uploaded_by)
         values ($1, 2, 'test-v2.pdf', 'application/pdf', 2000, $2,
                 'org/a/doc/v2/test-v2.pdf', $3)`,
        [documentId, "b".repeat(64), ids.clientA],
      );
      const { rows } = await db.query(
        `select review_status, current_version from public.documents where id = $1`,
        [documentId],
      );
      expect(rows[0]).toEqual({
        review_status: "quarantined",
        current_version: 2,
      });
    });
  });
});
