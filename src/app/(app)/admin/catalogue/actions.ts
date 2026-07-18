"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type CatalogueActionState = { error?: string; message?: string };

/** Publish/unpublish a service (RLS: services.manage). */
export async function toggleServicePublished(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const parsed = z
    .object({
      serviceId: z.string().uuid(),
      publish: z.enum(["true", "false"]),
    })
    .safeParse({
      serviceId: formData.get("serviceId"),
      publish: formData.get("publish"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("services")
    .update({ is_published: parsed.data.publish === "true" }, { count: "exact" })
    .eq("id", parsed.data.serviceId);
  if (error || !count) return { error: "Change was not permitted." };

  revalidatePath("/admin/catalogue");
  revalidatePath("/services");
  return { message: "Service visibility updated." };
}

/** Confirm a seed price as verified (clears the client-facing flag). */
export async function markPriceVerified(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const parsed = z.string().uuid().safeParse(formData.get("serviceId"));
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("services")
    .update({ requires_price_verification: false }, { count: "exact" })
    .eq("id", parsed.data);
  if (error || !count) return { error: "Change was not permitted." };

  revalidatePath("/admin/catalogue");
  revalidatePath("/services");
  return { message: "Price marked as verified." };
}

export async function togglePlanPublished(
  _prev: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const parsed = z
    .object({
      planId: z.string().uuid(),
      publish: z.enum(["true", "false"]),
    })
    .safeParse({
      planId: formData.get("planId"),
      publish: formData.get("publish"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("service_plans")
    .update({ is_published: parsed.data.publish === "true" }, { count: "exact" })
    .eq("id", parsed.data.planId);
  if (error || !count) return { error: "Change was not permitted." };

  revalidatePath("/admin/catalogue");
  revalidatePath("/plans");
  return { message: "Plan visibility updated." };
}
