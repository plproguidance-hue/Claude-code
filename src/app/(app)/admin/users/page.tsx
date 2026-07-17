import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";
import { InviteForm } from "./invite-form";
import { revokeInvitation } from "./actions";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: canInvite },
    { data: invitations },
    { data: organizations },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", {
      ascending: false,
    }),
    supabase.rpc("has_permission", { perm: "clients.create" }),
    supabase
      .from("invitations")
      .select("*")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Accounts within your permission scope. Role and membership changes
          are audited administrator operations.
        </p>
      </div>

      {Boolean(canInvite) && (
        <InviteForm organizations={organizations ?? []} />
      )}

      {Boolean(canInvite) && invitations && invitations.length > 0 && (
        <Card>
          <CardTitle>Open invitations</CardTitle>
          <ul className="mt-3 divide-y divide-line text-sm">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {invitation.email}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {invitation.role}
                    {invitation.auto_approve ? " · pre-approved" : ""}
                    {" · expires "}
                    <span className="tnum">
                      {formatDateUS(invitation.expires_at)}
                    </span>
                  </p>
                </div>
                <form action={revokeInvitation}>
                  <input
                    type="hidden"
                    name="invitationId"
                    value={invitation.id}
                  />
                  <button
                    type="submit"
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">
            Users you have permission to view
          </caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => (
              <tr
                key={profile.id}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-ink">
                  {profile.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{profile.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={profile.role} />
                </td>
                <td className="px-4 py-3">
                  <AccountStatusBadge status={profile.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {new Date(profile.created_at).toLocaleDateString("en-US")}
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No users visible in your permission scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
