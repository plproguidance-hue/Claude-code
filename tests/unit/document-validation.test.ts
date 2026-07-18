import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  safeFilename,
  sniffMime,
  validateUpload,
} from "@/lib/documents/validation";
import { UnconfiguredScanAdapter } from "@/lib/documents/virus-scan";

const PDF = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4,
]);
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const EXE = new Uint8Array([
  0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
]);

describe("sniffMime()", () => {
  it("recognizes allowed signatures", () => {
    expect(sniffMime(PDF)).toBe("application/pdf");
    expect(sniffMime(PNG)).toBe("image/png");
  });

  it("returns null for disallowed content (e.g. executables)", () => {
    expect(sniffMime(EXE)).toBeNull();
  });
});

describe("validateUpload()", () => {
  it("accepts a well-formed PDF declared as PDF", () => {
    expect(validateUpload(PDF, "application/pdf")).toEqual({
      ok: true,
      mime: "application/pdf",
    });
  });

  it("rejects rename tricks: PNG bytes declared as PDF", () => {
    const result = validateUpload(PNG, "application/pdf");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/does not match/i);
  });

  it("rejects executables regardless of declared type", () => {
    const result = validateUpload(EXE, "application/pdf");
    expect(result.ok).toBe(false);
  });

  it("rejects disallowed declared MIME types outright", () => {
    const result = validateUpload(PDF, "application/x-msdownload");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/only pdf/i);
  });

  it("rejects empty and oversized files", () => {
    expect(validateUpload(new Uint8Array(), "application/pdf").ok).toBe(false);
    const huge = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    huge.set(PDF, 0);
    const result = validateUpload(huge, "application/pdf");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/limited/i);
  });
});

describe("safeFilename()", () => {
  it("strips path components and dangerous characters", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("..\\..\\evil name!!.pdf")).toBe("evil-name-.pdf");
  });

  it("never returns an empty or dot-leading name", () => {
    expect(safeFilename("...")).toBe("file");
    expect(safeFilename(".hidden")).toBe("hidden");
  });

  it("caps length while preserving the extension", () => {
    const long = `${"a".repeat(200)}.pdf`;
    const result = safeFilename(long);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("UnconfiguredScanAdapter", () => {
  it("always reports 'unavailable' so uploads stay quarantined", async () => {
    const adapter = new UnconfiguredScanAdapter();
    await expect(adapter.scan()).resolves.toBe("unavailable");
  });
});
