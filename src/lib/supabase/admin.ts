import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. Bypasses Row Level Security — reserve for
 * administrative server tasks that cannot run under a user session (none in
 * Phase 1 runtime; the registration-approval flow deliberately runs under the
 * caller's own RLS-checked session).
 *
 * The `server-only` import makes any accidental client-bundle inclusion a
 * build error, so the service-role key can never ship to browsers.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Set it in the server environment (never in the browser).",
    );
  }
  const env = publicEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
