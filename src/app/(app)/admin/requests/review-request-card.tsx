"use client";

import { useActionState } from "react";

import type {
  DataRequestRow,
  DataRequestSubmissionRow,
} from "@/lib/database.types";
import {
  reviewDataRequest,
  type ReviewRequestActionState,
} from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatDateUS } from "@/lib/format";

const initialState: ReviewRequestActionState = {};

export function ReviewRequestCard({
  request,
  organizationName,
  submissions,
  canReview,
}: {
  request: DataRequestRow;
  organizationName: string;
  submissions: DataRequestSubmissionRow[];
  canReview: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    reviewDataRequest,
    initialState,
  );
  const latest = submissions[0];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{request.title}</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">
            {organizationName}
            {request.due_date && (
              <span className="tnum"> · due {formatDateUS(request.due_date)}</span>
            )}
            {request.priority !== "normal" && (
              <span className="ml-2 font-medium uppercase">
                {request.priority}
              </span>
            )}
          </p>
        </div>
      </div>

      {latest && (
        <div className="mt-3 rounded-lg bg-page px-3 py-2">
          <p className="text-xs font-medium text-ink-muted tnum">
            Latest submission — version {latest.version} ·{" "}
            {formatDateUS(latest.created_at)}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
            {latest.body}
          </p>
        </div>
      )}

      {submissions.length > 1 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Earlier versions ({submissions.length - 1})
          </summary>
          <ul className="mt-2 space-y-2">
            {submissions.slice(1).map((submission) => (
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

      {state.error && (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      )}
      {state.message && (
        <Alert tone="success" className="mt-3">
          {state.message}
        </Alert>
      )}

      {canReview && !state.message && (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <div>
            <Label htmlFor={`review-note-${request.id}`}>
              Note (required when rejecting)
            </Label>
            <Input
              id={`review-note-${request.id}`}
              name="note"
              maxLength={1000}
              placeholder="Feedback for the client…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
            >
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="danger"
              disabled={pending}
            >
              Request changes
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
