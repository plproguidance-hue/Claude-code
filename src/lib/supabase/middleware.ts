import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { publicEnv, safeInternalPath } from "@/lib/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/admin",
  "/pending-approval",
  "/recovery-codes",
  "/mfa",
];

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
];

function startsWithAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase auth session cookie on every request and applies
 * coarse route protection. Fine-grained gating (account status, staff role,
 * permissions) happens in server layouts; data access is always enforced
 * again by Row Level Security, so a bypassed redirect exposes nothing.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const env = publicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run other logic between client creation and getUser(); doing so
  // makes sessions terminate unpredictably.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeInternalPath(pathname, "/dashboard"));
    return NextResponse.redirect(url);
  }

  if (user && startsWithAny(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
