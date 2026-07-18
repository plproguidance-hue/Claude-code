"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type QuoteActionState = { error?: string; message?: string };

export async function requestQuotation(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      title: z.string().trim().min(3, "Describe what you need.").max(200),
      note: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      title: formData.get("title"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("quotations").insert({
    organization_id: parsed.data.organizationId,
    title: parsed.data.title,
    request_note: parsed.data.note,
    requested_by: user.id,
  });
  if (error) return { error: "Could not file the quotation request." };

  revalidatePath("/quotations");
  return { message: "Quotation requested — our team will prepare it." };
}

/** Accept / decline / request changes with an explicit confirmation. */
export async function decideQuotation(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const parsed = z
    .object({
      quoteId: z.string().uuid(),
      decision: z.enum(["accept", "decline", "request_changes"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
      confirm: z.literal("on"),
    })
    .safeParse({
      quoteId: formData.get("quoteId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
      confirm: formData.get("confirm"),
    });
  if (!parsed.success) {
    return { error: "Tick the confirmation box to record your decision." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_quotation", {
    p_quote: parsed.data.quoteId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    return {
      error:
        "The decision could not be recorded (the quotation may have expired or already been decided).",
    };
  }

  revalidatePath(`/quotations/${parsed.data.quoteId}`);
  revalidatePath("/quotations");
  return {
    message:
      parsed.data.decision === "accept"
        ? "Quotation accepted — our team converts it into an order and prepares the invoice."
        : parsed.data.decision === "decline"
          ? "Quotation declined."
          : "Change request sent to our team.",
  };
}
