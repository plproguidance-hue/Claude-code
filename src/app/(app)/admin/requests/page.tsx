import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { DataRequestStatusBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";
import { ReviewRequestCard } from "./review-request-card";

export const metadata: Metadata = { title: "Data request reviews" };

export default async function AdminRequestsPage() {
  const supabase = await createClient();

  const [
    { data: canReview },
    { data: requests },
    { data: submissions },
    { data: organizations },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "requests.review" }),
    supabase
      .from("data_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("data_request_submissions")
      .select("*")
      .order("version", { ascending: false }),
    supabase.from("organizations").select("id, name"),
  ]);

  const orgName = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ]),
  );
  const awaiting = (requests ?? []).filter((request) =>
    ["submitted", "under_review"].includes(request.status),
  );
  const others = (requests ?? []).filter(
    (request) => !["submitted", "under_review"].includes(request.status),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Data request reviews
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Client submissions awaiting review. Rejections always carry a reason
          and preserve every prior version.
        </p>
      </div>

      {awaiting.length > 0 ? (
        <ul className="space-y-4">
          {awaiting.map((request) => (
            <li key={request.id}>
              <ReviewRequestCard
                request={request}
                organizationName={
                  orgName.get(request.organization_id) ?? "Organization"
                }
                submissions={(submissions ?? []).filter(
                  (submission) => submission.request_id === request.id,
                )}
                canReview={Boolean(canReview)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <Inbox aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
          <CardTitle className="mt-4">Nothing awaiting review</CardTitle>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Client submissions appear here as soon as they respond to a data
            request.
          </p>
        </Card>
      )}

      {others.length > 0 && (
        <Card>
          <CardTitle>All requests in your scope</CardTitle>
          <ul className="mt-3 divide-y divide-line text-sm">
            {others.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {request.title}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {orgName.get(request.organization_id) ?? "—"}
                    {request.due_date && (
                      <span className="tnum">
                        {" "}
                        · due {formatDateUS(request.due_date)}
                      </span>
                    )}
                    {request.project_id && (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/projects/${request.project_id}`}
                          className="font-medium text-primary hover:text-primary-hover"
                        >
                          project
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <DataRequestStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
