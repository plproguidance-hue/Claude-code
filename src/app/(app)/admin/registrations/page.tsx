import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { RegistrationRow } from "./registration-row";

export const metadata: Metadata = { title: "Pending registrations" };

export default async function RegistrationsPage() {
  const supabase = await createClient();

  const [{ data: canDecide }, { data: pendingProfiles }] = await Promise.all([
    supabase.rpc("has_permission", { perm: "clients.approve_registration" }),
    supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Pending registrations
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Public self-registrations wait here until an authorized reviewer
          approves or rejects them. Every decision is recorded in the audit
          log.
        </p>
      </div>

      {!canDecide && (
        <Card className="border-warning/50 bg-warning/5">
          <p className="text-sm text-ink">
            You can view this queue but deciding registrations requires the
            <code className="mx-1 rounded bg-line/60 px-1 py-0.5 text-xs">
              clients.approve_registration
            </code>
            permission.
          </p>
        </Card>
      )}

      {pendingProfiles && pendingProfiles.length > 0 ? (
        <ul className="space-y-4">
          {pendingProfiles.map((profile) => (
            <li key={profile.id}>
              <RegistrationRow
                profile={profile}
                canDecide={Boolean(canDecide)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-12 text-center">
          <Inbox aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
          <CardTitle className="mt-4">No pending registrations</CardTitle>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            New self-registrations appear here after the applicant verifies
            their email address.
          </p>
        </Card>
      )}
    </div>
  );
}
