"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type PaymentActionState = { error?: string; message?: string };

export async function submitPaymentProof(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      invoiceId: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
      method: z.enum(["bank_transfer", "wise", "manual", "wallet_topup"]),
      amount: z.coerce
        .number()
        .positive("Enter the paid amount in USD.")
        .max(1_000_000),
      reference: z
        .string()
        .trim()
        .max(200)
        .optional()
        .transform((value) => (value ? value : null)),
      paidDate: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      invoiceId: formData.get("invoiceId") ?? undefined,
      method: formData.get("method"),
      amount: formData.get("amount"),
      reference: formData.get("reference") ?? undefined,
      paidDate: formData.get("paidDate") ?? undefined,
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("payments").insert({
    organization_id: parsed.data.organizationId,
    invoice_id: parsed.data.invoiceId,
    method: parsed.data.method,
    amount_cents: Math.round(parsed.data.amount * 100),
    reference: parsed.data.reference,
    paid_date: parsed.data.paidDate,
    note: parsed.data.note,
    submitted_by: user.id,
  });
  if (error) {
    return {
      error:
        "The payment proof could not be submitted (is the invoice open for payment?).",
    };
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/wallet");
  return {
    message:
      "Payment proof submitted. Our team verifies it and updates the balance.",
  };
}
