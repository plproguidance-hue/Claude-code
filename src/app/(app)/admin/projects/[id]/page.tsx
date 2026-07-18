import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/status";
import { formatDateUS } from "@/lib/format";
import {
  AssignStaffForm,
  CreateRequestForm,
  MilestoneControls,
  TransitionControls,
} from "./project-controls";

export const metadata: Metadata = { title: "Project (admin)" };

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [
    { data: service },
    { data: organization },
    { data: transitions },
    { data: canTransition },
    { data: canComplete },
    { data: canAssign },
    { data: history },
    { data: assignments },
    { data: milestones },
    { data: requests },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("id", project.service_id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", project.organization_id)
      .maybeSingle(),
    supabase
      .from("project_status_transitions")
      .select("*")
      .eq("from_status", project.status),
    supabase.rpc("has_permission", { perm: "projects.transition" }),
    supabase.rpc("has_permission", { perm: "projects.complete" }),
    supabase.rpc("has_permission", { perm: "projects.assign" }),
    supabase
      .from("project_status_history")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_assignments")
      .select("*")
      .eq("project_id", project.id),
    supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("sort"),
    supabase
      .from("data_requests")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["manager", "moderator", "administrator"]),
  ]);

  const staffName = new Map(
    (staffProfiles ?? []).map((profile) => [
      profile.id,
      profile.full_name ?? profile.email,
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {project.order_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {service?.name ?? "Project"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {organization?.name ?? "—"} · placed{" "}
            {formatDateUS(project.created_at)}
          </p>
          {project.client_note && (
            <p className="mt-2 max-w-xl rounded-lg bg-page px-3 py-2 text-sm text-ink-muted">
              Client note: {project.client_note}
            </p>
          )}
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {Boolean(canTransition) && (
        <TransitionControls
          projectId={project.id}
          nextStatuses={(transitions ?? []).map((t) => t.to_status)}
          canComplete={Boolean(canComplete)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Assigned staff</CardTitle>
          {(assignments ?? []).length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {(assignments ?? []).map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-ink">
                    {staffName.get(assignment.user_id) ?? assignment.user_id}
                    <span className="ml-2 text-xs text-ink-muted">
                      {assignment.role_label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No staff assigned yet.</p>
          )}
          {Boolean(canAssign) && (
            <AssignStaffForm
              projectId={project.id}
              staff={(staffProfiles ?? []).map((profile) => ({
                id: profile.id,
                label: `${profile.full_name ?? profile.email} (${profile.role})`,
              }))}
            />
          )}
        </Card>

        <Card>
          <CardTitle>Milestones</CardTitle>
          <MilestoneControls
            projectId={project.id}
            milestones={milestones ?? []}
            canManage={Boolean(canTransition)}
          />
        </Card>
      </div>

      <Card>
        <CardTitle>Data requests</CardTitle>
        {(requests ?? []).length > 0 ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {(requests ?? []).map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <span className="text-ink">{request.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs capitalize text-ink-muted">
                    {request.status.replaceAll("_", " ")}
                  </span>
                  {["submitted", "under_review"].includes(request.status) && (
                    <Link
                      href="/admin/requests"
                      className="text-xs font-medium text-primary hover:text-primary-hover"
                    >
                      Review
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            No data requests on this project.
          </p>
        )}
        <CreateRequestForm
          projectId={project.id}
          organizationId={project.organization_id}
        />
      </Card>

      <Card>
        <CardTitle>Full status history (including staff-only notes)</CardTitle>
        <ol className="mt-4 space-y-4">
          {(history ?? []).map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span
                aria-hidden
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  entry.client_visible ? "bg-primary" : "bg-charcoal"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-ink">
                  {PROJECT_STATUS_LABELS[entry.to_status]}
                  {!entry.client_visible && (
                    <span className="ml-2 rounded bg-charcoal/10 px-1.5 py-0.5 text-xs text-charcoal">
                      Staff only
                    </span>
                  )}
                </p>
                {entry.note && (
                  <p className="text-sm text-ink-muted">{entry.note}</p>
                )}
                <p className="mt-0.5 text-xs text-ink-muted tnum">
                  {staffName.get(entry.actor_id ?? "") ?? "System"} ·{" "}
                  {new Date(entry.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
