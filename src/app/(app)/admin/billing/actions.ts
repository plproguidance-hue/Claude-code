"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { parseLineItems } from "@/lib/billing/labels";

export type BillingActionState = { error?: string; message?: string };

export async function createQuotation(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      title: z.string().trim().min(3).max(200),
      terms: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : null)),
      validUntil: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      title: formData.get("title"),
      terms: formData.get("terms") ?? undefined,
      validUntil: formData.get("validUntil") ?? undefined,
    });
  if (!parsed.success) return { error: "Check the quotation details." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: created, error } = await supabase
    .from("quotations")
    .insert({
      organization_id: parsed.data.organizationId,
      title: parsed.data.title,
      status: "draft",
      terms: parsed.data.terms,
      valid_until: parsed.data.validUntil,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: "Could not create the quotation (permission denied?)." };
  }
  redirect(`/admin/quotations/${created.id}`);
}

export async function addQuotationVersion(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z
    .object({
      quoteId: z.string().uuid(),
      items: z.string().min(1, "Add line items."),
    })
    .safeParse({
      quoteId: formData.get("quoteId"),
      items: formData.get("items"),
    });
  if (!parsed.success) return { error: "Add line items." };

  let items;
  try {
    items = parseLineItems(parsed.data.items);
  } catch (parseError) {
    return { error: String((parseError as Error).message) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("quotations")
    .select("current_version")
    .eq("id", parsed.data.quoteId)
    .maybeSingle();
  if (!existing) return { error: "Quotation not found." };

  const { data: version, error: versionError } = await supabase
    .from("quotation_versions")
    .insert({
      quotation_id: parsed.data.quoteId,
      version: existing.current_version + 1,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (versionError || !version) {
    return { error: "Could not create the version (permission denied?)." };
  }

  const { error: itemsError } = await supabase
    .from("quotation_line_items")
    .insert(
      items.map((item, index) => ({
        quotation_version_id: version.id,
        label: item.label,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        sort: index,
      })),
    );
  if (itemsError) return { error: "Could not save the line items." };

  revalidatePath(`/admin/quotations/${parsed.data.quoteId}`);
  return { message: `Version ${existing.current_version + 1} saved.` };
}

export async function sendQuotationAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z.string().uuid().safeParse(formData.get("quoteId"));
  if (!parsed.success) return { error: "Invalid quotation." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_quotation", {
    p_quote: parsed.data,
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "You don't have permission to send quotations."
        : "Could not send (does the quotation have a version with items?).",
    };
  }
  revalidatePath(`/admin/quotations/${parsed.data}`);
  return { message: "Quotation sent to the client." };
}

export async function convertQuotationAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z.string().uuid().safeParse(formData.get("quoteId"));
  if (!parsed.success) return { error: "Invalid quotation." };

  const supabase = await createClient();
  const { data: invoiceId, error } = await supabase.rpc("convert_quotation", {
    p_quote: parsed.data,
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "You don't have permission to convert quotations."
        : "Conversion failed (only accepted quotations convert, exactly once).",
    };
  }
  revalidatePath(`/admin/quotations/${parsed.data}`);
  revalidatePath("/admin/invoices");
  return {
    message: `Converted: one order plus draft invoice ${invoiceId ?? ""}. Review and issue the invoice separately.`,
  };
}

export async function createInvoice(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      items: z.string().min(1, "Add line items."),
      notes: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      items: formData.get("items"),
      notes: formData.get("notes") ?? undefined,
    });
  if (!parsed.success) return { error: "Check the invoice details." };

  let items;
  try {
    items = parseLineItems(parsed.data.items);
  } catch (parseError) {
    return { error: String((parseError as Error).message) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: parsed.data.organizationId,
      notes: parsed.data.notes,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: "Could not create the draft invoice (permission denied?)." };
  }

  const { error: itemsError } = await supabase.from("invoice_line_items").insert(
    items.map((item, index) => ({
      invoice_id: created.id,
      label: item.label,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      sort: index,
    })),
  );
  if (itemsError) return { error: "Could not save the line items." };

  redirect(`/admin/invoices/${created.id}`);
}

export async function issueInvoiceAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z
    .object({
      invoiceId: z.string().uuid(),
      dueDate: z
        .string()
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      invoiceId: formData.get("invoiceId"),
      dueDate: formData.get("dueDate") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid invoice." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_invoice", {
    p_invoice: parsed.data.invoiceId,
    ...(parsed.data.dueDate ? { p_due_date: parsed.data.dueDate } : {}),
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "Issuing invoices requires the invoices.issue permission (administrators)."
        : "Could not issue (draft only, needs line items).",
    };
  }
  revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
  revalidatePath("/admin/invoices");
  return { message: "Invoice issued and now visible to the client." };
}

export async function reviewPaymentAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = z
    .object({
      paymentId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      paymentId: formData.get("paymentId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid review." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_payment", {
    p_payment: parsed.data.paymentId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "Payment review requires the payments.review permission (administrators)."
        : "Review failed (payment may already be decided).",
    };
  }
  revalidatePath("/admin/payments/review");
  return {
    message:
      parsed.data.decision === "approved"
        ? "Payment approved — invoice/wallet updated atomically."
        : "Payment rejected.",
  };
}
