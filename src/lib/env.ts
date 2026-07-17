import { z } from "zod";

/**
 * Safe environment configuration.
 *
 * - Public vars are validated separately and are the only values that may
 *   reach the browser (Next.js inlines `NEXT_PUBLIC_*` at build time; the
 *   literal `process.env.NEXT_PUBLIC_X` references below are required for
 *   that inlining to work).
 * - Server vars are validated lazily so importing this module never crashes
 *   a build that legitimately lacks runtime secrets. The service-role helper
 *   additionally lives in a `server-only` module (src/lib/supabase/admin.ts)
 *   so it can never be bundled for the client.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function parsePublicEnv(
  raw: Record<string, string | undefined>,
): PublicEnv {
  const result = publicSchema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid public environment configuration (${missing}). ` +
        "Copy .env.example to .env.local and fill in the Supabase values.",
    );
  }
  return result.data;
}

export function publicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

export function serverEnv(): ServerEnv {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  });
}

/**
 * Only ever redirect to same-site paths. Rejects absolute URLs,
 * protocol-relative URLs ("//evil.example") and backslash tricks.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  return candidate;
}
