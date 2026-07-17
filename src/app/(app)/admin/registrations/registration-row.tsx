"use client";

import { useActionState } from "react";

import type { ProfileRow } from "@/lib/database.types";
import { decideRegistration, type DecisionActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: DecisionActionState = {};

export function RegistrationRow({
  profile,
  canDecide,
}: {
  profile: ProfileRow;
  canDecide: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    decideRegistration,
    initialState,
  );

  const submitted = new Date(profile.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {profile.full_name ?? "(no name provided)"}
          </p>
          <p className="truncate text-sm text-ink-muted">{profile.email}</p>
          <p className="mt-1 text-xs text-ink-muted tnum">
            Submitted {submitted}
          </p>
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

      {canDecide && !state.message && (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="userId" value={profile.id} />
          <div>
            <Label htmlFor={`note-${profile.id}`}>
              Decision note (optional, recorded in audit log)
            </Label>
            <Input
              id={`note-${profile.id}`}
              name="note"
              maxLength={500}
              placeholder="e.g. Verified with client by phone"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
            >
              {pending ? "Saving…" : "Approve"}
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
