"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SecurityActionState = { error?: string; message?: string };

const passwordSchema = z
  .string()
  .min(12, "New password must be at least 12 characters.")
  .max(128)
  .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), {
    message: "New password must include letters and numbers.",
  });

/** Password change requires current-password verification (spec §6.13). */
export async function changePassword(
  _prev: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password."),
      newPassword: passwordSchema,
      confirm: z.string(),
    })
    .safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirm: formData.get("confirm"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (parsed.data.newPassword !== parsed.data.confirm) {
    return { error: "New passwords do not match." };
  }
  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return { error: "Choose a password you haven't used here before." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Session expired — sign in again." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) return { error: "Password could not be updated. Try again." };

  return { message: "Password updated." };
}

/** Revokes every session except the current one. */
export async function signOutOtherSessions(): Promise<SecurityActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { error: "Could not revoke other sessions. Try again." };
  return { message: "All other sessions have been signed out." };
}
