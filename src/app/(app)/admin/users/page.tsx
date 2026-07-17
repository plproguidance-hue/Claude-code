import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Accounts within your permission scope. Role and membership editing
          arrives with the staff-management console in a later phase; today
          changes are made by administrators via audited database operations.
        </p>
      </div>

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
