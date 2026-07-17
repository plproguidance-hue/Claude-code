import { describe, expect, it } from "vitest";

import {
  US_JURISDICTIONS,
  isUsJurisdiction,
  jurisdictionName,
} from "@/config/us-states";

describe("canonical US jurisdictions", () => {
  it("contains all 50 states, DC, and the 5 major territories", () => {
    const states = US_JURISDICTIONS.filter((j) => j.kind === "state");
    const districts = US_JURISDICTIONS.filter((j) => j.kind === "district");
    const territories = US_JURISDICTIONS.filter((j) => j.kind === "territory");
    expect(states).toHaveLength(50);
    expect(districts).toHaveLength(1);
    expect(territories).toHaveLength(5);
  });

  it("has unique, uppercase, two-letter codes", () => {
    const codes = US_JURISDICTIONS.map((j) => j.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("recognizes membership case-insensitively", () => {
    expect(isUsJurisdiction("WY")).toBe(true);
    expect(isUsJurisdiction("wy")).toBe(true);
    expect(isUsJurisdiction("PR")).toBe(true);
    expect(isUsJurisdiction("UK")).toBe(false);
    expect(isUsJurisdiction("AE")).toBe(false);
  });

  it("resolves display names", () => {
    expect(jurisdictionName("WY")).toBe("Wyoming");
    expect(jurisdictionName("DC")).toBe("District of Columbia");
    expect(jurisdictionName("ZZ")).toBe("ZZ");
  });
});
