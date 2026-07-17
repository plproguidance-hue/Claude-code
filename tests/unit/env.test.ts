import { describe, expect, it } from "vitest";

import { parsePublicEnv, safeInternalPath } from "@/lib/env";

describe("parsePublicEnv()", () => {
  it("accepts a valid configuration", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("rejects a missing anon key with actionable guidance", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }),
    ).toThrow(/\.env\.example/);
  });

  it("rejects a malformed URL", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe("safeInternalPath()", () => {
  it("keeps ordinary internal paths", () => {
    expect(safeInternalPath("/dashboard", "/x")).toBe("/dashboard");
    expect(safeInternalPath("/admin/registrations?tab=1", "/x")).toBe(
      "/admin/registrations?tab=1",
    );
  });

  it("falls back for absolute and protocol-relative URLs", () => {
    expect(safeInternalPath("https://evil.example", "/x")).toBe("/x");
    expect(safeInternalPath("//evil.example", "/x")).toBe("/x");
  });

  it("falls back for backslash tricks and empty values", () => {
    expect(safeInternalPath("/\\evil.example", "/x")).toBe("/x");
    expect(safeInternalPath("", "/x")).toBe("/x");
    expect(safeInternalPath(null, "/x")).toBe("/x");
    expect(safeInternalPath(undefined, "/x")).toBe("/x");
  });
});
