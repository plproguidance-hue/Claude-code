"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type DecisionActionState = {
  error?: string;
  message?: string;
};

const decisionSchema = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z
    .string()
    .trim()
    .max(500, "Note is too long.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

/**
 * Runs under the caller's own session: `approve_registration` re-checks the
 * `clients.approve_registration` permission inside the database and writes
 * the decision + audit row atomically. No service-role key involved.
 */
export async function decideRegistration(
  _prev: DecisionActionState,
  formData: FormData,
): Promise<DecisionActionState> {
  const parsed = decisionSchema.safeParse({
    userId: formData.get("userId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid decision submission." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_registration", {
    target_user: parsed.data.userId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });

  if (error) {
    if (error.code === "42501") {
      return {
        error: "You don't have permission to decide registrations.",
      };
    }
    return {
      error:
        "The decision could not be recorded (it may already be decided). Refresh and try again.",
    };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  return {
    message:
      parsed.data.decision === "approved"
        ? "Registration approved — the account is now active."
        : "Registration rejected.",
  };
}
