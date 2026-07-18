import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DataRequestStatusBadge,
  ProjectStatusBadge,
} from "@/components/ui/badge";
import {
  ACTION_OWNER_LABELS,
  PROJECT_ACTION_OWNER,
  PROJECT_STATUS_LABELS,
  progressPercent,
} from "@/lib/projects/status";
import { formatDateUS, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RequestResponseForm } from "../../requests/request-response-form";
import { MessageThread } from "./message-thread";
import { isStaffRole } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Project workspace" };

const TABS = [
  ["overview", "Overview"],
  ["timeline", "Timeline"],
  ["requests", "Data requests"],
  ["messages", "Messages"],
  ["milestones", "Milestones"],
] as const;

type TabKey = (typeof TABS)[number][0];

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab: TabKey = (TABS.map(([key]) => key) as string[]).includes(
    String(query.tab),
  )
    ? (query.tab as TabKey)
    : "overview";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [
    { data: service },
    { data: history },
    { data: requests },
    { data: milestones },
    { data: company },
    { data: messages },
    { data: profile },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("id", project.service_id)
      .maybeSingle(),
    supabase
      .from("project_status_history")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("data_requests")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("sort"),
    project.company_id
      ? supabase
          .from("companies")
          .select("id, legal_name")
          .eq("id", project.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("project_messages")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at"),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("role", ["administrator", "manager", "moderator"]),
  ]);

  const staffNames = Object.fromEntries(
    (staffProfiles ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );
  const viewerIsStaff = profile ? isStaffRole(profile.role) : false;

  const owner = PROJECT_ACTION_OWNER[project.status];
  const progress = progressPercent(project.status);
  const openRequests = (requests ?? []).filter((request) =>
    ["sent", "viewed", "in_progress", "rejected_changes_required"].includes(
      request.status,
    ),
  );

  return (
    <div className="space-y-6">
      {query.ordered === "1" && (
        <Alert tone="success">
          Order placed. Our team reviews it and moves the project forward —
          every step appears in the timeline below.
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {project.order_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {service?.name ?? "Service project"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company?.legal_name ? `${company.legal_name} · ` : ""}
            ordered {formatDateUS(project.created_at)}
            {service ? ` · ${formatUsd(service.price_cents, service.price_note)}` : ""}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">
              {PROJECT_STATUS_LABELS[project.status]}
            </p>
            <p className="text-sm text-ink-muted">
              Next action: {ACTION_OWNER_LABELS[owner]}
            </p>
          </div>
          {openRequests.length > 0 && (
            <Link
              href={`/projects/${project.id}?tab=requests`}
              className="rounded-lg bg-warning/15 px-3 py-1.5 text-sm font-medium text-[#92600A]"
            >
              {openRequests.length} request
              {openRequests.length > 1 ? "s" : ""} need your input
            </Link>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Project progress"
          className="mt-4 h-2 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <nav aria-label="Project sections" className="overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map(([key, label]) => (
            <li key={key}>
              <Link
                href={`/projects/${project.id}?tab=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm font-medium",
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {label}
                {key === "requests" && openRequests.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-xs tnum">
                    {openRequests.length}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>Order details</CardTitle>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Order ID</dt>
                <dd className="text-ink tnum">{project.order_number}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Company</dt>
                <dd className="text-ink">{company?.legal_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Completed</dt>
                <dd className="text-ink tnum">
                  {formatDateUS(project.completed_at)}
                </dd>
              </div>
            </dl>
            {project.client_note && (
              <p className="mt-3 rounded-lg bg-page px-3 py-2 text-sm text-ink-muted">
                Your note: {project.client_note}
              </p>
            )}
          </Card>
          <Card className="bg-page/60">
            <CardTitle>Messages, documents & invoices</CardTitle>
            <p className="mt-2 text-sm text-ink-muted">
              Project messaging, the document vault, and invoicing connect to
              this workspace in upcoming phases — data requests below already
              work end to end.
            </p>
          </Card>
        </div>
      )}

      {tab === "timeline" && (
        <Card>
          <CardTitle>Status timeline</CardTitle>
          <ol className="mt-4 space-y-4">
            {(history ?? []).map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {PROJECT_STATUS_LABELS[entry.to_status]}
                  </p>
                  {entry.note && (
                    <p className="text-sm text-ink-muted">{entry.note}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-muted tnum">
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
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          {(requests ?? []).length > 0 ? (
            (requests ?? []).map((request) => (
              <Card key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{request.title}</p>
                    {request.description && (
                      <p className="mt-1 text-sm text-ink-muted">
                        {request.description}
                      </p>
                    )}
                    {request.due_date && (
                      <p className="mt-1 text-xs text-ink-muted tnum">
                        Due {formatDateUS(request.due_date)}
                      </p>
                    )}
                  </div>
                  <DataRequestStatusBadge status={request.status} />
                </div>
                {request.rejection_reason && (
                  <Alert tone="error" className="mt-3">
                    Reviewer feedback: {request.rejection_reason}
                  </Alert>
                )}
                <RequestResponseForm request={request} />
              </Card>
            ))
          ) : (
            <Card className="py-8 text-center">
              <p className="text-sm text-ink-muted">
                No data requests for this project.
              </p>
            </Card>
          )}
        </div>
      )}

      {tab === "messages" && (
        <MessageThread
          projectId={project.id}
          messages={messages ?? []}
          currentUserId={user.id}
          staff={viewerIsStaff}
          staffNames={staffNames}
        />
      )}

      {tab === "milestones" && (
        <Card>
          <CardTitle>Milestones</CardTitle>
          {(milestones ?? []).length > 0 ? (
            <ul className="mt-4 space-y-3">
              {(milestones ?? []).map((milestone) => (
                <li key={milestone.id} className="flex items-start gap-3">
                  {milestone.completed_at ? (
                    <CheckCircle2
                      aria-hidden
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                    />
                  ) : (
                    <Circle
                      aria-hidden
                      className="mt-0.5 h-5 w-5 shrink-0 text-line"
                    />
                  )}
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        milestone.completed_at
                          ? "text-ink-muted line-through"
                          : "text-ink",
                      )}
                    >
                      {milestone.title}
                    </p>
                    {milestone.due_date && (
                      <p className="text-xs text-ink-muted tnum">
                        Due {formatDateUS(milestone.due_date)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Milestones appear here once our team plans the work.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
