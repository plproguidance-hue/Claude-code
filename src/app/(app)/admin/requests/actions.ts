"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ReviewRequestActionState = { error?: string; message?: string };

/**
 * Runs under the caller's session — `review_data_request()` re-checks the
 * `requests.review` permission and tenant scope in the database.
 */
export async function reviewDataRequest(
  _prev: ReviewRequestActionState,
  formData: FormData,
): Promise<ReviewRequestActionState> {
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid review submission." };

  if (parsed.data.decision === "rejected" && !parsed.data.note) {
    return { error: "A rejection needs a reason the client can act on." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_data_request", {
    p_request: parsed.data.requestId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission to review data requests." };
    }
    return {
      error: "Review failed (the request may not be awaiting review). Refresh.",
    };
  }

  revalidatePath("/admin/requests");
  return {
    message:
      parsed.data.decision === "approved"
        ? "Submission approved."
        : "Changes requested from the client.",
  };
}
