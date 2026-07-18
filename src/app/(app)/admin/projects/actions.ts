"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/status";

export type AdminProjectActionState = { error?: string; message?: string };

/**
 * All mutations run under the caller's session — `transition_project()`
 * re-validates permission, tenant scope, and transition validity in the
 * database and records the audited history row atomically.
 */
export async function transitionProject(
  _prev: AdminProjectActionState,
  formData: FormData,
): Promise<AdminProjectActionState> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      newStatus: z.enum(
        PROJECT_STATUSES as unknown as [ProjectStatus, ...ProjectStatus[]],
      ),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
      staffOnly: z.literal("on").optional(),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      newStatus: formData.get("newStatus"),
      note: formData.get("note") ?? undefined,
      staffOnly: formData.get("staffOnly") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid transition submission." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_project", {
    p_project: parsed.data.projectId,
    new_status: parsed.data.newStatus,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    is_client_visible: parsed.data.staffOnly !== "on",
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission for this transition." };
    }
    if (error.message.includes("invalid transition")) {
      return { error: "That transition is not allowed from the current status." };
    }
    return { error: "Transition failed. Refresh and try again." };
  }

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  revalidatePath("/admin/projects");
  return { message: "Status updated." };
}

export async function assignStaff(
  _prev: AdminProjectActionState,
  formData: FormData,
): Promise<AdminProjectActionState> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      userId: z.string().uuid(),
      roleLabel: z.enum(["manager", "moderator"]),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      userId: formData.get("userId"),
      roleLabel: formData.get("roleLabel"),
    });
  if (!parsed.success) return { error: "Choose a staff member." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("project_assignments").insert({
    project_id: parsed.data.projectId,
    user_id: parsed.data.userId,
    role_label: parsed.data.roleLabel,
    assigned_by: user?.id ?? null,
  });
  if (error) {
    return {
      error:
        "Assignment failed (permission denied or the person is already assigned).",
    };
  }

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  return { message: "Staff assigned." };
}

export async function removeAssignment(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      assignmentId: z.string().uuid(),
      projectId: z.string().uuid(),
    })
    .safeParse({
      assignmentId: formData.get("assignmentId"),
      projectId: formData.get("projectId"),
    });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("project_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId);
  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
}

export async function addMilestone(
  _prev: AdminProjectActionState,
  formData: FormData,
): Promise<AdminProjectActionState> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      title: z.string().trim().min(2, "Enter a milestone title.").max(200),
      dueDate: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      dueDate: formData.get("dueDate") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the milestone." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").insert({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
  });
  if (error) return { error: "Could not add the milestone." };

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  return { message: "Milestone added." };
}

export async function toggleMilestone(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      milestoneId: z.string().uuid(),
      projectId: z.string().uuid(),
      complete: z.enum(["true", "false"]),
    })
    .safeParse({
      milestoneId: formData.get("milestoneId"),
      projectId: formData.get("projectId"),
      complete: formData.get("complete"),
    });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("project_milestones")
    .update({
      completed_at:
        parsed.data.complete === "true" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.milestoneId);
  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
}

export async function createDataRequest(
  _prev: AdminProjectActionState,
  formData: FormData,
): Promise<AdminProjectActionState> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      organizationId: z.string().uuid(),
      title: z.string().trim().min(2, "Enter a title.").max(200),
      description: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : null)),
      kind: z.enum(["information", "document"]),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      dueDate: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      organizationId: formData.get("organizationId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      kind: formData.get("kind"),
      priority: formData.get("priority"),
      dueDate: formData.get("dueDate") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("data_requests").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    kind: parsed.data.kind,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate,
    created_by: user?.id ?? null,
  });
  if (error) return { error: "Could not create the request (permission denied?)." };

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  return { message: "Data request sent to the client." };
}
