import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRANSITIONS,
  PROJECT_ACTION_OWNER,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  progressPercent,
} from "@/lib/projects/status";

const migrationSql = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260717120000_catalogue_projects.sql",
  ),
  "utf8",
);

describe("TS transition map ↔ SQL seed", () => {
  it("matches the seeded transition matrix exactly (both directions)", () => {
    const seeded = new Set(
      [
        ...migrationSql.matchAll(/\('([a-z_]+)',\s'([a-z_]+)'\)/g),
      ]
        .map((match) => `${match[1]}→${match[2]}`)
        // The same tuple syntax appears in other seeds; keep only pairs
        // where both sides are valid project statuses.
        .filter((pair) => {
          const [from, to] = pair.split("→");
          return (
            (PROJECT_STATUSES as readonly string[]).includes(from ?? "") &&
            (PROJECT_STATUSES as readonly string[]).includes(to ?? "")
          );
        }),
    );

    const fromTs = new Set<string>();
    for (const status of PROJECT_STATUSES) {
      for (const target of DEFAULT_TRANSITIONS[status]) {
        fromTs.add(`${status}→${target}`);
      }
    }

    expect([...seeded].sort()).toEqual([...fromTs].sort());
  });
});

describe("status metadata completeness", () => {
  it("covers all 13 spec §6.5 statuses", () => {
    expect(PROJECT_STATUSES).toHaveLength(13);
    for (const status of PROJECT_STATUSES) {
      expect(PROJECT_STATUS_LABELS[status], status).toBeTruthy();
      expect(PROJECT_ACTION_OWNER[status], status).toBeTruthy();
      expect(progressPercent(status)).toBeGreaterThanOrEqual(0);
      expect(progressPercent(status)).toBeLessThanOrEqual(100);
    }
  });

  it("terminal statuses have no outgoing transitions", () => {
    expect(DEFAULT_TRANSITIONS.completed).toHaveLength(0);
    expect(DEFAULT_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it("every configured target is itself reachable-from or terminal", () => {
    for (const status of PROJECT_STATUSES) {
      for (const target of DEFAULT_TRANSITIONS[status]) {
        expect(PROJECT_STATUSES, `${status}→${target}`).toContain(target);
      }
    }
  });
});
