import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The 19 seed services and prices come verbatim from the MASTER BUILD PROMPT
 * §6.4. This test pins the migration to that list so a drifting seed fails
 * the build. (All seed prices remain flagged `requires_price_verification`
 * by column default until an administrator verifies them.)
 */

const SPEC_CATALOGUE: [string, number, string | null][] = [
  ["USA LLC Formation", 19900, null],
  ["EIN Application", 7900, null],
  ["ITIN Application", 14900, null],
  ["Resale Certificate", 5900, null],
  ["Walmart Seller Account Setup", 24900, null],
  ["Amazon Seller Account Setup", 24900, null],
  ["PayPal Setup", 9900, null],
  ["Stripe Setup", 9900, null],
  ["Wise Setup", 7900, null],
  ["Payoneer Setup", 7900, null],
  ["Bank Account Support", 14900, null],
  ["Virtual Address", 14900, null],
  ["Registered Agent", 9900, null],
  ["Annual Compliance Filing", 12900, null],
  ["Tax Filing", 29900, null],
  ["Bookkeeping", 9900, "/month"],
  ["Marketplace Appeal", 19900, null],
  ["Website Development", 49900, null],
  ["Digital Marketing", 29900, "/month"],
];

const migrationSql = readFileSync(
  path.resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260717120000_catalogue_projects.sql",
  ),
  "utf8",
);

describe("catalogue seed ↔ spec §6.4", () => {
  const seeded = [
    ...migrationSql.matchAll(
      /'([^']+)',\s'[a-z0-9-]+',\s*\n\s+'[^']+',\s(\d+),\s(?:'([^']+)'|null),\strue,\s\d+\)/g,
    ),
  ].map((match) => ({
    name: match[1],
    cents: Number(match[2]),
    note: match[3] ?? null,
  }));

  it("seeds exactly the 19 spec services", () => {
    expect(seeded).toHaveLength(SPEC_CATALOGUE.length);
    expect(seeded.map((service) => service.name).sort()).toEqual(
      SPEC_CATALOGUE.map(([name]) => name).sort(),
    );
  });

  it("seeds the exact spec prices in USD cents", () => {
    for (const [name, cents, note] of SPEC_CATALOGUE) {
      const service = seeded.find((candidate) => candidate.name === name);
      expect(service, name).toBeTruthy();
      expect(service?.cents, name).toBe(cents);
      expect(service?.note ?? null, `${name} price note`).toBe(note);
    }
  });

  it("keeps demonstration plans unpublished and labelled", () => {
    expect(migrationSql).toMatch(/'Starter \(Demonstration\)'[\s\S]*?false, 1\)/);
    expect(migrationSql).toMatch(/'Growth \(Demonstration\)'[\s\S]*?false, 2\)/);
  });
});
