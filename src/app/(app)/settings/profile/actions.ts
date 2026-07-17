"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error?: string;
  message?: string;
};

export async function updateDisplayName(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long.")
    .safeParse(formData.get("fullName"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  // RLS restricts this update to the caller's own row; the
  // profiles_protect_columns trigger blocks any privileged column.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", user.id);

  if (error) return { error: "Could not save your name. Try again." };

  revalidatePath("/settings/profile");
  return { message: "Profile updated." };
}
