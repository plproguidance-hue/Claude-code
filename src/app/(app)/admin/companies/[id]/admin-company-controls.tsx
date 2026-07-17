"use client";

import { useActionState } from "react";

import type { CompanyUpdateRequestRow } from "@/lib/database.types";
import { maskEin } from "@/lib/format";
import {
  addDeadline,
  reviewUpdateRequest,
  setCompanyStatus,
  type AdminCompanyActionState,
} from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: AdminCompanyActionState = {};

export function StatusControls({
  companyId,
  status,
}: {
  companyId: string;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(
    setCompanyStatus,
    initialState,
  );

  const nextStates =
    status === "pending_review"
      ? (["active"] as const)
      : status === "active"
        ? (["inactive", "dissolved"] as const)
        : (["active"] as const);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardTitle>Staff controls</CardTitle>
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
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="companyId" value={companyId} />
        {nextStates.map((nextStatus) => (
          <Button
            key={nextStatus}
            type="submit"
            name="status"
            value={nextStatus}
            variant={nextStatus === "dissolved" ? "danger" : "primary"}
            size="sm"
            disabled={pending}
          >
            Mark {nextStatus.replace("_", " ")}
          </Button>
        ))}
      </form>
      <p className="mt-2 text-xs text-ink-muted">
        Status changes are permission-checked in the database and recorded in
        the audit log.
      </p>
    </Card>
  );
}

export function ReviewRequestCard({
  request,
  canReview,
}: {
  request: CompanyUpdateRequestRow;
  canReview: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    reviewUpdateRequest,
    initialState,
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Pending request</CardTitle>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {Object.entries(request.changes).map(([field, value]) => (
              <li key={field}>
                <span className="text-ink-muted">
                  {field.replaceAll("_", " ")}:
                </span>{" "}
                {field === "ein" ? maskEin(value) : value}
              </li>
            ))}
          </ul>
          {request.evidence_note && (
            <p className="mt-2 text-sm text-ink-muted">
              Evidence: {request.evidence_note}
            </p>
          )}
        </div>
      </div>

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
          <input type="hidden" name="companyId" value={request.company_id} />
          <div>
            <Label htmlFor={`note-${request.id}`}>Review note (optional)</Label>
            <Input id={`note-${request.id}`} name="note" maxLength={500} />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
            >
              Approve & apply
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="danger"
              disabled={pending}
            >
              Reject
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function AddDeadlineForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(
    addDeadline,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Add compliance deadline</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="dl-title">Title</Label>
            <Input id="dl-title" name="title" required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="dl-kind">Type</Label>
            <select
              id="dl-kind"
              name="kind"
              required
              defaultValue="annual_report"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="annual_report">Annual report</option>
              <option value="registered_agent_renewal">
                Registered agent renewal
              </option>
              <option value="tax_filing">Tax filing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="dl-due">Due date</Label>
            <Input id="dl-due" name="dueDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="dl-notes">Notes (optional)</Label>
            <Input id="dl-notes" name="notes" maxLength={1000} />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add deadline"}
        </Button>
      </form>
    </Card>
  );
}
