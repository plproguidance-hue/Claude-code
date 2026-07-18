"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type OrderActionState = { error?: string };

/**
 * Places an order for a published service. RLS enforces: the caller must be
 * a member of the target organization, the service must be published, and
 * the project starts in 'order_submitted' — the initial history row and
 * audit event are written by database triggers.
 */
export async function orderService(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const parsed = z
    .object({
      serviceId: z.string().uuid(),
      organizationId: z.string().uuid(),
      companyId: z
        .string()
        .optional()
        .transform((value) => (value ? value : null))
        .refine(
          (value) =>
            value === null || z.string().uuid().safeParse(value).success,
          "Invalid company.",
        ),
      note: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      serviceId: formData.get("serviceId"),
      organizationId: formData.get("organizationId"),
      companyId: formData.get("companyId") ?? undefined,
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Check the order details." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      organization_id: parsed.data.organizationId,
      company_id: parsed.data.companyId,
      service_id: parsed.data.serviceId,
      requested_by: user.id,
      client_note: parsed.data.note,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        "The order could not be placed. Check that your account belongs to this organization and the service is available.",
    };
  }

  redirect(`/projects/${created.id}?ordered=1`);
}
