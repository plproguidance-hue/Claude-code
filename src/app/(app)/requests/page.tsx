import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Card, CardTitle } from "@/components/ui/card";
import { DataRequestStatusBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";
import { RequestResponseForm } from "./request-response-form";

export const metadata: Metadata = { title: "Data requests" };

export default async function RequestsPage() {
  const supabase = await createClient();

  const [{ data: requests }, { data: submissions }] = await Promise.all([
    supabase
      .from("data_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("data_request_submissions")
      .select("*")
      .order("version", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Data requests</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Information our team needs from you. Every response is kept as a
          version — resubmitting after feedback never destroys earlier
          answers.
        </p>
      </div>

      {requests && requests.length > 0 ? (
        <ul className="space-y-4">
          {requests.map((request) => {
            const versions = (submissions ?? []).filter(
              (submission) => submission.request_id === request.id,
            );
            return (
              <li key={request.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{request.title}</p>
                      {request.description && (
                        <p className="mt-1 text-sm text-ink-muted">
                          {request.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-ink-muted">
                        {request.priority !== "normal" && (
                          <span className="mr-2 font-medium uppercase">
                            {request.priority}
                          </span>
                        )}
                        {request.due_date && (
                          <span className="tnum">
                            Due {formatDateUS(request.due_date)}
                          </span>
                        )}
                        {request.project_id && (
                          <>
                            {" · "}
                            <Link
                              href={`/projects/${request.project_id}?tab=requests`}
                              className="font-medium text-primary hover:text-primary-hover"
                            >
                              View project
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <DataRequestStatusBadge status={request.status} />
                  </div>

                  {request.rejection_reason && (
                    <Alert tone="error" className="mt-3">
                      Reviewer feedback: {request.rejection_reason}
                    </Alert>
                  )}

                  {versions.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-ink">
                        Response history ({versions.length})
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {versions.map((submission) => (
                          <li
                            key={submission.id}
                            className="rounded-lg bg-page px-3 py-2 text-sm"
                          >
                            <p className="text-xs font-medium text-ink-muted tnum">
                              Version {submission.version} ·{" "}
                              {formatDateUS(submission.created_at)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-ink">
                              {submission.body}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <RequestResponseForm request={request} />
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No data requests</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            When our team needs information or documents from you, requests
            appear here with clear due dates.
          </p>
        </Card>
      )}
    </div>
  );
}
