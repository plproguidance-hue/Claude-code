"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type DocumentReviewActionState = { error?: string; message?: string };

export async function decideDocument(
  _prev: DocumentReviewActionState,
  formData: FormData,
): Promise<DocumentReviewActionState> {
  const parsed = z
    .object({
      documentId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      documentId: formData.get("documentId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid review submission." };

  if (parsed.data.decision === "rejected" && !parsed.data.note) {
    return { error: "A rejection needs a reason the client can act on." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_document", {
    p_document: parsed.data.documentId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission to review documents." };
    }
    return {
      error: "Review failed (the document may not be awaiting review).",
    };
  }

  revalidatePath("/admin/documents/review");
  revalidatePath("/documents");
  return {
    message:
      parsed.data.decision === "approved"
        ? "Document approved."
        : "Document rejected with reason.",
  };
}

/** Administrator-only quarantine decision (enforced again in the database). */
export async function decideQuarantine(
  _prev: DocumentReviewActionState,
  formData: FormData,
): Promise<DocumentReviewActionState> {
  const parsed = z
    .object({
      documentId: z.string().uuid(),
      decision: z.enum(["release", "reject"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .safeParse({
      documentId: formData.get("documentId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid quarantine decision." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("release_quarantined_document", {
    p_document: parsed.data.documentId,
    decision: parsed.data.decision,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error) {
    if (error.code === "42501") {
      return {
        error: "Only administrators can release or reject quarantined files.",
      };
    }
    return { error: "The quarantine decision could not be recorded." };
  }

  revalidatePath("/admin/documents/review");
  revalidatePath("/documents");
  return {
    message:
      parsed.data.decision === "release"
        ? "Released from quarantine — now in the review queue."
        : "Quarantined file rejected.",
  };
}
