import { describe, expect, it } from "vitest";

import { maskEin } from "@/lib/format";

describe("maskEin()", () => {
  it("masks a well-formed EIN to its last four digits", () => {
    expect(maskEin("12-3456789")).toBe("••-•••6789");
  });

  it("fully masks malformed values instead of leaking them", () => {
    expect(maskEin("123456789")).toBe("••-•••••••");
    expect(maskEin("secret")).toBe("••-•••••••");
  });

  it("renders a dash for missing values", () => {
    expect(maskEin(null)).toBe("—");
    expect(maskEin(undefined)).toBe("—");
    expect(maskEin("")).toBe("—");
  });
});
