"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/auth/permissions";

export type StaffActionState = { error?: string; message?: string };

/** Role changes are RLS + trigger-enforced (users.roles.manage) and audited. */
export async function changeUserRole(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(ROLES as unknown as [Role, ...Role[]]),
    })
    .safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return { error: "Invalid role change." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role }, { count: "exact" })
    .eq("id", parsed.data.userId);
  if (error || !count) {
    return {
      error: "Role change denied (users.roles.manage required).",
    };
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/users");
  return { message: "Role updated and audited." };
}

export async function addStaffAssignment(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      organizationId: z.string().uuid(),
    })
    .safeParse({
      userId: formData.get("userId"),
      organizationId: formData.get("organizationId"),
    });
  if (!parsed.success) return { error: "Choose a staff member and organization." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("staff_assignments").insert({
    organization_id: parsed.data.organizationId,
    user_id: parsed.data.userId,
    assigned_by: user?.id ?? null,
  });
  if (error) {
    return {
      error:
        "Assignment failed (already assigned, or users.roles.manage required).",
    };
  }

  revalidatePath("/admin/staff");
  return { message: "Assignment added." };
}

export async function removeStaffAssignment(formData: FormData): Promise<void> {
  const parsed = z.string().uuid().safeParse(formData.get("assignmentId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("staff_assignments").delete().eq("id", parsed.data);
  revalidatePath("/admin/staff");
}
