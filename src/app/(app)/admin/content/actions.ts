"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ContentActionState = { error?: string; message?: string };

export async function toggleArticlePublished(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = z
    .object({
      articleId: z.string().uuid(),
      publish: z.enum(["true", "false"]),
    })
    .safeParse({
      articleId: formData.get("articleId"),
      publish: formData.get("publish"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("help_articles")
    .update({ is_published: parsed.data.publish === "true" }, { count: "exact" })
    .eq("id", parsed.data.articleId);
  if (error || !count) return { error: "Change not permitted (content.manage required)." };

  revalidatePath("/admin/content");
  revalidatePath("/help");
  return { message: "Article visibility updated." };
}

export async function togglePerkPublished(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = z
    .object({
      perkId: z.string().uuid(),
      publish: z.enum(["true", "false"]),
    })
    .safeParse({
      perkId: formData.get("perkId"),
      publish: formData.get("publish"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("perks_resources")
    .update({ is_published: parsed.data.publish === "true" }, { count: "exact" })
    .eq("id", parsed.data.perkId);
  if (error || !count) return { error: "Change not permitted (content.manage required)." };

  revalidatePath("/admin/content");
  revalidatePath("/perks");
  return { message: "Perk visibility updated." };
}

export async function sendAnnouncement(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      title: z.string().trim().min(3, "Enter a title.").max(200),
      body: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .transform((value) => (value ? value : undefined)),
      link: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value ? value : undefined))
        .refine(
          (value) => !value || value.startsWith("/"),
          "Links must be internal portal paths starting with /",
        ),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      title: formData.get("title"),
      body: formData.get("body") ?? undefined,
      link: formData.get("link") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the announcement." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_org_announcement", {
    org: parsed.data.organizationId,
    n_title: parsed.data.title,
    ...(parsed.data.body ? { n_body: parsed.data.body } : {}),
    ...(parsed.data.link ? { n_link: parsed.data.link } : {}),
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "Announcements require the notifications.send permission."
        : "The announcement could not be sent.",
    };
  }

  return { message: "Announcement delivered to the organization's members." };
}
