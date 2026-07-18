"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type RequestActionState = { error?: string; message?: string };

/**
 * Client response to a data request. The SECURITY DEFINER function verifies
 * membership, allowed status, and versions the submission (prior versions
 * are preserved).
 */
export async function submitRequestResponse(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      body: z
        .string()
        .trim()
        .min(2, "Enter your response.")
        .max(10_000, "Response is too long."),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      body: formData.get("body"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your response." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_data_request", {
    p_request: parsed.data.requestId,
    p_body: parsed.data.body,
  });
  if (error) {
    return {
      error:
        "The response could not be submitted (the request may already be under review).",
    };
  }

  revalidatePath("/requests");
  revalidatePath("/projects");
  return { message: "Response submitted — our team will review it." };
}
