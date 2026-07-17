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

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/**
 * Personal contact details — addresses may be international (spec §6.13);
 * only company/business addresses are USA-only.
 */
export async function updateContactDetails(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = z
    .object({
      phone: optional(30),
      addressLine1: optional(200),
      addressLine2: optional(200),
      city: optional(100),
      region: optional(100),
      postalCode: optional(20),
      country: optional(60),
      timezone: optional(60),
    })
    .safeParse({
      phone: formData.get("phone") ?? undefined,
      addressLine1: formData.get("addressLine1") ?? undefined,
      addressLine2: formData.get("addressLine2") ?? undefined,
      city: formData.get("city") ?? undefined,
      region: formData.get("region") ?? undefined,
      postalCode: formData.get("postalCode") ?? undefined,
      country: formData.get("country") ?? undefined,
      timezone: formData.get("timezone") ?? undefined,
    });
  if (!parsed.success) {
    return { error: "Check the contact details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: parsed.data.phone,
      address_line1: parsed.data.addressLine1,
      address_line2: parsed.data.addressLine2,
      city: parsed.data.city,
      region: parsed.data.region,
      postal_code: parsed.data.postalCode,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);
  if (error) return { error: "Could not save your contact details." };

  revalidatePath("/settings/profile");
  return { message: "Contact details updated." };
}
