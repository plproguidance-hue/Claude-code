import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/badge";
import {
  ACTION_OWNER_LABELS,
  PROJECT_ACTION_OWNER,
  progressPercent,
} from "@/lib/projects/status";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

const CLOSED = ["completed", "cancelled"] as const;

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: services }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .not("status", "in", `(${CLOSED.join(",")})`)
      .order("created_at", { ascending: false }),
    supabase.from("services").select("id, name"),
  ]);

  const serviceName = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Active projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every ordered service runs as a project with a tracked status and
            history.{" "}
            <Link
              href="/orders"
              className="font-medium text-primary hover:text-primary-hover"
            >
              View full order history
            </Link>
          </p>
        </div>
        <Link
          href="/services"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover motion-safe:transition-colors"
        >
          Order a service
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const owner = PROJECT_ACTION_OWNER[project.status];
            const progress = progressPercent(project.status);
            return (
              <li key={project.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {serviceName.get(project.service_id) ?? "Service"}
                      </p>
                      <p className="text-xs text-ink-muted tnum">
                        {project.order_number} · ordered{" "}
                        {formatDateUS(project.created_at)}
                      </p>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </div>

                  <div className="mt-4">
                    <div
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Project progress"
                      className="h-2 overflow-hidden rounded-full bg-line"
                    >
                      <div
                        className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      {ACTION_OWNER_LABELS[owner]}
                    </p>
                  </div>

                  <Link
                    href={`/projects/${project.id}`}
                    className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    View workspace
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No active projects</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Order a service from the catalogue and it appears here as a
            tracked project.
          </p>
        </Card>
      )}
    </div>
  );
}
