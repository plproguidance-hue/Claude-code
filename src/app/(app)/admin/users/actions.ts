"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type InviteActionState = {
  error?: string;
  message?: string;
  /** Shown exactly once at creation; only the hash is stored. */
  inviteUrl?: string;
};

export async function createInvitation(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email("Enter a valid email."),
      role: z.enum(["client", "moderator", "manager", "administrator"]),
      organizationId: z
        .string()
        .optional()
        .transform((value) => (value ? value : null))
        .refine(
          (value) => value === null || z.string().uuid().safeParse(value).success,
          "Invalid organization.",
        ),
      autoApprove: z.literal("on").optional(),
    })
    .safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
      organizationId: formData.get("organizationId") ?? undefined,
      autoApprove: formData.get("autoApprove") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the invitation." };
  }
  if (parsed.data.role === "client" && !parsed.data.organizationId) {
    return { error: "Client invitations need a target organization." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired — sign in again." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  // RLS: insert requires clients.create and invited_by = caller.
  const { error } = await supabase.from("invitations").insert({
    email: parsed.data.email,
    role: parsed.data.role,
    organization_id:
      parsed.data.role === "client" ? parsed.data.organizationId : null,
    token_hash: tokenHash,
    auto_approve: parsed.data.autoApprove === "on",
    invited_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission to create invitations." };
    }
    return { error: "Could not create the invitation. Try again." };
  }

  const configured = publicEnv().NEXT_PUBLIC_SITE_URL;
  let origin = configured?.replace(/\/$/, "");
  if (!origin) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    origin = `${proto}://${host}`;
  }

  revalidatePath("/admin/users");
  return {
    message:
      "Invitation created. Share this link now — it is shown only once and expires in 7 days.",
    inviteUrl: `${origin}/invite/${token}`,
  };
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const parsed = z.string().uuid().safeParse(formData.get("invitationId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  // RLS: requires invitations.approve.
  await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("revoked_at", null);
  revalidatePath("/admin/users");
}
