"use client";

import { useActionState } from "react";

import type { DataRequestRow } from "@/lib/database.types";
import { DATA_REQUEST_SUBMITTABLE } from "@/lib/projects/status";
import { submitRequestResponse, type RequestActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

const initialState: RequestActionState = {};

export function RequestResponseForm({ request }: { request: DataRequestRow }) {
  const [state, formAction, pending] = useActionState(
    submitRequestResponse,
    initialState,
  );

  const canSubmit = (DATA_REQUEST_SUBMITTABLE as readonly string[]).includes(
    request.status,
  );
  if (!canSubmit) return null;

  return (
    <form action={formAction} className="mt-4 space-y-3" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <Label htmlFor={`response-${request.id}`}>
          {request.status === "rejected_changes_required"
            ? "Revised response"
            : "Your response"}
        </Label>
        <textarea
          id={`response-${request.id}`}
          name="body"
          rows={4}
          required
          maxLength={10_000}
          placeholder={
            request.kind === "document"
              ? "Describe the document you are providing (file uploads arrive with the document vault)…"
              : "Provide the requested information…"
          }
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <input type="hidden" name="requestId" value={request.id} />
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit response"}
      </Button>
    </form>
  );
}
