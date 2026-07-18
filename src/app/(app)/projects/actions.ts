"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type MessageActionState = { error?: string; message?: string };

/**
 * Posts to a project thread. RLS enforces participation: org members post
 * client-visible messages; staff in scope may also post internal notes that
 * clients can never read.
 */
export async function postProjectMessage(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      body: z.string().trim().min(1, "Write a message.").max(10000),
      internal: z.literal("on").optional(),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      body: formData.get("body"),
      internal: formData.get("internal") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a message." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("project_messages").insert({
    project_id: parsed.data.projectId,
    author_id: user.id,
    body: parsed.data.body,
    is_internal: parsed.data.internal === "on",
  });
  if (error) return { error: "The message could not be posted." };

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  return { message: "Message posted." };
}
