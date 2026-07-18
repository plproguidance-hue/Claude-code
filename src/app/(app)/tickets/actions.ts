"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { TicketRow, TicketStatus } from "@/lib/database.types";

export type TicketActionState = { error?: string; message?: string };

const DEPARTMENTS: readonly TicketRow["department"][] = [
  "sales",
  "order_support",
  "documents",
  "accounting_invoice",
  "marketplace_support",
  "technical_support",
  "compliance_tax",
  "general_support",
];

export async function createTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      department: z.enum(
        DEPARTMENTS as [TicketRow["department"], ...TicketRow["department"][]],
      ),
      subject: z.string().trim().min(3, "Enter a subject.").max(200),
      body: z.string().trim().min(5, "Describe the issue.").max(10000),
      priority: z.enum(["low", "normal", "high", "urgent"]),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      department: formData.get("department"),
      subject: formData.get("subject"),
      body: formData.get("body"),
      priority: formData.get("priority"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the ticket." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: created, error } = await supabase
    .from("tickets")
    .insert({
      organization_id: parsed.data.organizationId,
      department: parsed.data.department,
      subject: parsed.data.subject,
      priority: parsed.data.priority,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: "Could not open the ticket. Try again." };
  }

  const { error: replyError } = await supabase.rpc("reply_ticket", {
    p_ticket: created.id,
    p_body: parsed.data.body,
  });
  if (replyError) {
    return { error: "Ticket created but the first message failed — open it and reply." };
  }

  redirect(`/tickets/${created.id}`);
}

export async function replyToTicket(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      body: z.string().trim().min(1, "Write a message.").max(10000),
      internal: z.literal("on").optional(),
    })
    .safeParse({
      ticketId: formData.get("ticketId"),
      body: formData.get("body"),
      internal: formData.get("internal") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a message." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_ticket", {
    p_ticket: parsed.data.ticketId,
    p_body: parsed.data.body,
    p_internal: parsed.data.internal === "on",
  });
  if (error) {
    return {
      error: error.message.includes("read-only")
        ? "This ticket is closed — reopen it to continue the conversation."
        : "The reply could not be sent.",
    };
  }

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
  return { message: "Reply sent." };
}

export async function changeTicketStatus(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      status: z.enum(["assigned", "resolved", "closed", "reopened"]),
      assignee: z
        .string()
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      ticketId: formData.get("ticketId"),
      status: formData.get("status"),
      assignee: formData.get("assignee") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid status change." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ticket_status", {
    p_ticket: parsed.data.ticketId,
    new_status: parsed.data.status as TicketStatus,
    ...(parsed.data.assignee ? { assignee: parsed.data.assignee } : {}),
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "You don't have permission for that ticket action."
        : "The status change was not allowed.",
    };
  }

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  return { message: "Ticket updated." };
}
