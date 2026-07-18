import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/badge";
import {
  AssignmentForm,
  RemoveAssignmentButton,
  RoleSelect,
} from "./staff-controls";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function AdminStaffPage() {
  const supabase = await createClient();
  const [
    { data: canManage },
    { data: profiles },
    { data: assignments },
    { data: organizations },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "users.roles.manage" }),
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("staff_assignments").select("*"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  if (!canManage) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardTitle>Role management access required</CardTitle>
        <p className="mt-2 text-sm text-ink-muted">
          Managing staff, roles, and assignments requires the{" "}
          <code className="text-xs">users.roles.manage</code> permission.
        </p>
      </Card>
    );
  }

  const staff = (profiles ?? []).filter((p) =>
    ["administrator", "manager", "moderator"].includes(p.role),
  );
  const orgName = new Map((organizations ?? []).map((o) => [o.id, o.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Staff & roles</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Role changes and organization assignments are enforced by database
          permissions and recorded in the audit log.
        </p>
      </div>

      <Card>
        <CardTitle>Roles</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {(profiles ?? []).map((profile) => (
            <li
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {profile.full_name ?? profile.email}
                </p>
                <p className="text-xs text-ink-muted">{profile.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={profile.role} />
                <RoleSelect userId={profile.id} currentRole={profile.role} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Assigned-scope staff (managers & moderators)</CardTitle>
        <p className="mt-1 text-sm text-ink-muted">
          Managers and moderators only reach organizations they are assigned
          to; administrators reach everything.
        </p>
        <ul className="mt-3 divide-y divide-line">
          {staff
            .filter((member) => member.role !== "administrator")
            .map((member) => {
              const memberAssignments = (assignments ?? []).filter(
                (assignment) => assignment.user_id === member.id,
              );
              return (
                <li key={member.id} className="py-3">
                  <p className="font-medium text-ink">
                    {member.full_name ?? member.email}{" "}
                    <span className="text-xs text-ink-muted">
                      ({member.role})
                    </span>
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {memberAssignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink"
                      >
                        {orgName.get(assignment.organization_id) ?? "—"}
                        <RemoveAssignmentButton assignmentId={assignment.id} />
                      </li>
                    ))}
                    {memberAssignments.length === 0 && (
                      <li className="text-xs text-ink-muted">
                        No assignments — sees no client organizations.
                      </li>
                    )}
                  </ul>
                  <AssignmentForm
                    userId={member.id}
                    organizations={organizations ?? []}
                  />
                </li>
              );
            })}
        </ul>
      </Card>
    </div>
  );
}
