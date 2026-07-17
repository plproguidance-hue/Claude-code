"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type AdminCompanyActionState = { error?: string; message?: string };

/**
 * Runs under the caller's session: review_company_update_request() re-checks
 * `companies.update_request_review` and tenant access in the database and
 * applies whitelisted changes + audit atomically.
 */
export async function reviewUpdateRequest(
  _prev: AdminCompanyActionState,
  formData: FormData,
): Promise<AdminCompanyActionState> {
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      companyId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z
        .string()
        .trim()
        .max(500)
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      companyId: formData.get("companyId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid review submission." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_company_update_request", {
    request_id: parsed.data.requestId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission to review update requests." };
    }
    return {
      error: "Review failed (the request may already be decided). Refresh.",
    };
  }

  revalidatePath(`/admin/companies/${parsed.data.companyId}`);
  revalidatePath("/admin/companies");
  return {
    message:
      parsed.data.decision === "approved"
        ? "Request approved and changes applied."
        : "Request rejected.",
  };
}

export async function setCompanyStatus(
  _prev: AdminCompanyActionState,
  formData: FormData,
): Promise<AdminCompanyActionState> {
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      status: z.enum(["active", "inactive", "dissolved", "pending_review"]),
    })
    .safeParse({
      companyId: formData.get("companyId"),
      status: formData.get("status"),
    });
  if (!parsed.success) return { error: "Invalid status submission." };

  const supabase = await createClient();
  // RLS + the companies_protect_columns trigger restrict status changes to
  // staff holding companies.update_request_review within tenant scope.
  const { error, count } = await supabase
    .from("companies")
    .update({ status: parsed.data.status }, { count: "exact" })
    .eq("id", parsed.data.companyId);

  if (error || !count) {
    return { error: "Status change was not permitted." };
  }

  revalidatePath(`/admin/companies/${parsed.data.companyId}`);
  revalidatePath("/admin/companies");
  return { message: `Company marked ${parsed.data.status.replace("_", " ")}.` };
}

export async function addDeadline(
  _prev: AdminCompanyActionState,
  formData: FormData,
): Promise<AdminCompanyActionState> {
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      title: z.string().trim().min(2, "Enter a title.").max(200),
      kind: z.enum([
        "annual_report",
        "registered_agent_renewal",
        "tax_filing",
        "other",
      ]),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date."),
      notes: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      companyId: formData.get("companyId"),
      title: formData.get("title"),
      kind: formData.get("kind"),
      dueDate: formData.get("dueDate"),
      notes: formData.get("notes") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the deadline." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("company_compliance_deadlines").insert({
    company_id: parsed.data.companyId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    due_date: parsed.data.dueDate,
    notes: parsed.data.notes,
    created_by: user?.id ?? null,
  });
  if (error) return { error: "Could not add the deadline (permission denied?)." };

  revalidatePath(`/admin/companies/${parsed.data.companyId}`);
  return { message: "Deadline added." };
}
