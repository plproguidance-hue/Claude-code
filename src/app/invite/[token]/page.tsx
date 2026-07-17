import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MailX } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { brand } from "@/config/brand";
import { RegisterForm } from "@/app/(auth)/register/register-form";

export const metadata: Metadata = { title: "Invitation" };

/**
 * Public invitation acceptance. The token is looked up via the
 * SECURITY DEFINER `invitation_preview` function (hash comparison in the
 * database, minimal fields, no table access). Signup itself reuses the
 * standard registration flow — the database trigger matches the invitation
 * by email and applies role/organization/pre-approval.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: previews } = await supabase.rpc("invitation_preview", {
    token,
  });
  const invitation = previews?.[0];

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-graphite via-charcoal to-graphite">
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex justify-center">
          <Image
            src={brand.logo.dark}
            alt={brand.logo.alt}
            width={220}
            height={48}
            priority
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface p-6 shadow-xl sm:p-8">
          {invitation && invitation.is_valid ? (
            <>
              <h1 className="text-xl font-semibold text-ink">
                You&apos;re invited
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {invitation.organization_name
                  ? `Join ${invitation.organization_name} on the ${brand.brandName} portal`
                  : `Join the ${brand.brandName} portal team`}{" "}
                as <strong>{invitation.invited_role}</strong>. Create your
                account with{" "}
                <strong className="break-all">{invitation.email}</strong> to
                accept.
              </p>
              <RegisterForm lockedEmail={invitation.email} />
            </>
          ) : (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
                <MailX aria-hidden className="h-6 w-6 text-danger" />
              </div>
              <h1 className="text-xl font-semibold text-ink">
                Invitation unavailable
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                This invitation link is invalid, expired, already used, or has
                been revoked. Ask the person who invited you for a new link,
                or contact{" "}
                <a
                  className="font-medium text-primary hover:text-primary-hover"
                  href={`mailto:${brand.publicEmail}`}
                >
                  {brand.publicEmail}
                </a>
                .
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary-hover"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-white/60">
          {brand.legalName} · {brand.tagline}
        </p>
      </main>
    </div>
  );
}
