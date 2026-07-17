import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/badge";
import { ProfileForm } from "./profile-form";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
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
  if (!profile) redirect("/pending-approval");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your account details. Extended profile, security, and session
          settings arrive in the next phase.
        </p>
      </div>

      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-ink">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Role
            </dt>
            <dd className="mt-1">
              <RoleBadge role={profile.role} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Status
            </dt>
            <dd className="mt-1">
              <AccountStatusBadge status={profile.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Member since
            </dt>
            <dd className="mt-1 text-sm text-ink tnum">
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-muted">
          Email changes flow through a verification process and role/status
          are managed by administrators.
        </p>
      </Card>

      <Card>
        <CardTitle>Display name</CardTitle>
        <ProfileForm initialName={profile.full_name ?? ""} />
      </Card>

      <Card>
        <CardTitle>Contact details</CardTitle>
        <ContactForm profile={profile} />
      </Card>
    </div>
  );
}
