import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/badge";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";
import { formatDateUS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects (admin)" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = (PROJECT_STATUSES as readonly string[]).includes(
    String(params.status),
  )
    ? (params.status as ProjectStatus)
    : null;

  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (filter) query = query.eq("status", filter);

  const [{ data: projects }, { data: services }, { data: organizations }] =
    await Promise.all([
      query,
      supabase.from("services").select("id, name"),
      supabase.from("organizations").select("id, name"),
    ]);

  const serviceName = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );
  const orgName = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Orders across your scope. Transitions are validated against the
          configured status matrix and always audited.
        </p>
      </div>

      <nav aria-label="Status filter" className="overflow-x-auto">
        <ul className="flex min-w-max gap-1.5">
          <li>
            <Link
              href="/admin/projects"
              className={cn(
                "inline-block rounded-full px-3 py-1.5 text-xs font-medium",
                !filter
                  ? "bg-primary text-white"
                  : "border border-line text-ink-muted hover:text-ink",
              )}
            >
              All
            </Link>
          </li>
          {PROJECT_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={`/admin/projects?status=${status}`}
                className={cn(
                  "inline-block rounded-full px-3 py-1.5 text-xs font-medium",
                  filter === status
                    ? "bg-primary text-white"
                    : "border border-line text-ink-muted hover:text-ink",
                )}
              >
                {PROJECT_STATUS_LABELS[status]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Projects</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Order</th>
              <th scope="col" className="px-4 py-3 font-medium">Service</th>
              <th scope="col" className="px-4 py-3 font-medium">Organization</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((project) => (
              <tr key={project.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-medium text-primary hover:text-primary-hover tnum"
                  >
                    {project.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">
                  {serviceName.get(project.service_id) ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {orgName.get(project.organization_id) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {formatDateUS(project.created_at)}
                </td>
              </tr>
            ))}
            {(!projects || projects.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No projects{filter ? " in this status" : ""} within your scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
