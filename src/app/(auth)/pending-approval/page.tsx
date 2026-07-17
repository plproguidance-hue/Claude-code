import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, ShieldAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account pending" };

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "active") redirect("/dashboard");

  const rejected = profile?.status === "rejected";
  const suspended =
    profile?.status === "suspended" || profile?.status === "deactivated";

  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
        {rejected || suspended ? (
          <ShieldAlert aria-hidden className="h-6 w-6 text-danger" />
        ) : (
          <Clock aria-hidden className="h-6 w-6 text-warning" />
        )}
      </div>

      {rejected ? (
        <>
          <h1 className="text-xl font-semibold text-ink">
            Registration not approved
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your registration was reviewed and could not be approved. If you
            believe this is a mistake, contact us at{" "}
            <a
              className="font-medium text-primary hover:text-primary-hover"
              href={`mailto:${brand.publicEmail}`}
            >
              {brand.publicEmail}
            </a>
            .
          </p>
        </>
      ) : suspended ? (
        <>
          <h1 className="text-xl font-semibold text-ink">
            Account unavailable
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            This account is currently suspended. Contact{" "}
            <a
              className="font-medium text-primary hover:text-primary-hover"
              href={`mailto:${brand.publicEmail}`}
            >
              {brand.publicEmail}
            </a>{" "}
            for assistance.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-ink">
            Your account is pending approval
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Thanks for verifying your email
            {profile?.full_name ? `, ${profile.full_name}` : ""}. Our team
            reviews every registration before opening portal access. You&apos;ll
            receive an email as soon as a decision is made — no portal data is
            available until then.
          </p>
        </>
      )}

      <form action="/auth/sign-out" method="post" className="mt-6">
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
