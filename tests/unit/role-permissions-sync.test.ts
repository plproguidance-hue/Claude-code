import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/lib/auth/permissions";

/**
 * Guards the contract between the TypeScript permission mirror and the SQL
 * seed migration: if either side changes without the other, this fails.
 * (The integration suite additionally proves the live database matches.)
 */

const migrationSql = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260717090200_seed_permissions.sql",
  ),
  "utf8",
);

describe("seed migration ↔ TypeScript matrix", () => {
  it("seeds exactly the catalogued permissions", () => {
    const seededKeys = [
      ...migrationSql.matchAll(/^\s{2}\('([a-z_.]+)',\s'[^']+',\s'[a-z]+'\)/gm),
    ].map((match) => match[1]);
    expect(seededKeys.sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("seeds exactly the TypeScript grants for client, moderator, and manager", () => {
    for (const role of ["client", "moderator", "manager"] as const) {
      const seeded = [
        ...migrationSql.matchAll(
          new RegExp(`\\('${role}',\\s'([a-z_.]+)'\\)`, "g"),
        ),
      ].map((match) => match[1]);
      expect(seeded.sort(), role).toEqual([...ROLE_PERMISSIONS[role]].sort());
    }
  });

  it("grants administrators the full catalogue via select-all", () => {
    expect(migrationSql).toMatch(
      /select 'administrator'::public\.app_role, p\.key\s+from public\.permissions p/,
    );
    expect([...ROLE_PERMISSIONS.administrator].sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });
});
