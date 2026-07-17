"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { publicEnv, safeInternalPath } from "@/lib/env";

export type AuthActionState = {
  error?: string;
  message?: string;
};

/**
 * Deliberately short common-password blocklist backstop; hosted Supabase adds
 * breached-password (HIBP) defense in project auth settings.
 */
const COMMON_PASSWORDS = new Set([
  "password1234",
  "passw0rd1234",
  "qwerty123456",
  "letmein12345",
  "proguidance1",
]);

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be at most 128 characters.")
  .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), {
    message: "Password must include letters and numbers.",
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "This password is too common. Choose a more unique one.",
  });

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

async function siteOrigin(): Promise<string> {
  const configured = publicEnv().NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Generic by design: never reveals whether the account exists or which
// factor failed (enumeration defense, spec §10).
const GENERIC_SIGN_IN_ERROR =
  "Sign-in failed. Check your email and password and try again.";

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1) })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) return { error: GENERIC_SIGN_IN_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: GENERIC_SIGN_IN_ERROR };

  // Route enrolled-MFA users through the TOTP challenge before any content.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/mfa/challenge");
  }

  redirect(safeInternalPath(formData.get("next")?.toString(), "/dashboard"));
}

export async function register(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, "Enter your full name.")
        .max(120, "Name is too long."),
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    // Keep the response generic: duplicate-account details would allow
    // enumeration. Supabase itself returns an opaque success for repeats
    // when confirmations are on.
    return {
      error: "Registration could not be completed. Try again in a moment.",
    };
  }

  redirect("/verify-email");
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const genericMessage =
    "If an account exists for that address, a reset link is on its way.";

  if (!parsed.success) return { message: genericMessage };

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Always the same response, success or not (enumeration defense).
  return { message: genericMessage };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }
  if (formData.get("confirm") !== formData.get("password")) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Your reset link has expired. Request a new one from the sign-in page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "Password could not be updated. Try again." };

  redirect("/login?message=password-updated");
}

export async function resendVerification(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const genericMessage =
    "If that address has an unverified account, a new email is on its way.";
  if (!parsed.success) return { message: genericMessage };

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` },
  });
  return { message: genericMessage };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
