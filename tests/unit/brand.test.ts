import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

/**
 * The brand configuration is contractual (MASTER BUILD PROMPT §2): these
 * exact values must not drift, including the intentional double-"a" in the
 * public email address.
 */
describe("ProGuidance brand configuration", () => {
  it("carries the exact company identity", () => {
    expect(brand.legalName).toBe("ProGuidance Tech Solution");
    expect(brand.brandName).toBe("ProGuidance");
    expect(brand.tagline).toBe("Launch. Scale. Succeed.");
    expect(brand.websiteUrl).toBe("https://proguidancetechsolution.com/");
    expect(brand.phone).toBe("+880 1617 158 463");
    expect(brand.whatsapp).toBe("+880 1617 158 463");
  });

  it("preserves the intentional double-a public email spelling", () => {
    expect(brand.publicEmail).toBe("proguidaance@gmail.com");
  });

  it("uses the Sheridan, WY business address", () => {
    expect(brand.address).toEqual({
      line1: "30 N Gould St Ste 48621",
      city: "Sheridan",
      state: "WY",
      postalCode: "82801",
      country: "USA",
    });
  });

  it("is USA-only with USD-only billing and the PG-INV- prefix", () => {
    expect(brand.market).toBe("US");
    expect(brand.currency).toBe("USD");
    expect(brand.invoicePrefix).toBe("PG-INV-");
  });

  it("carries the exact §4 core palette", () => {
    expect(brand.palette).toEqual({
      primary: "#FF4B00",
      primaryHover: "#E64200",
      charcoal: "#3F4A4D",
      graphite: "#273236",
      pageBackground: "#F6F7F9",
      surface: "#FFFFFF",
      textPrimary: "#172126",
      textSecondary: "#64748B",
      border: "#E2E8F0",
      success: "#16A34A",
      warning: "#F59E0B",
      error: "#DC2626",
      info: "#2563EB",
    });
  });

  it("declares the logo placeholder honestly until the official asset lands", () => {
    expect(brand.logo.status).toBe("placeholder");
    expect(brand.logo.alt).toContain("ProGuidance");
  });
});
