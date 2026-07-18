"use client";

import { useActionState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import type { ProjectMilestoneRow } from "@/lib/database.types";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";
import {
  addMilestone,
  assignStaff,
  createDataRequest,
  toggleMilestone,
  transitionProject,
  type AdminProjectActionState,
} from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatDateUS } from "@/lib/format";
import { cn } from "@/lib/utils";

const initialState: AdminProjectActionState = {};

const selectClasses =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function TransitionControls({
  projectId,
  nextStatuses,
  canComplete,
}: {
  projectId: string;
  nextStatuses: ProjectStatus[];
  canComplete: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    transitionProject,
    initialState,
  );

  const options = nextStatuses.filter(
    (status) => status !== "completed" || canComplete,
  );

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardTitle>Move project forward</CardTitle>
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
      {options.length > 0 ? (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="newStatus">Next status</Label>
              <select
                id="newStatus"
                name="newStatus"
                required
                className={selectClasses}
              >
                {options.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="transition-note">Note (optional)</Label>
              <Input id="transition-note" name="note" maxLength={1000} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="staffOnly" />
            Staff-only note (hidden from the client)
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Updating…" : "Apply transition"}
          </Button>
          <p className="text-xs text-ink-muted">
            Only transitions allowed by the configured matrix are offered;
            the database re-validates and audits every change.
          </p>
        </form>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          This is a terminal status — no further transitions are configured.
        </p>
      )}
    </Card>
  );
}

export function AssignStaffForm({
  projectId,
  staff,
}: {
  projectId: string;
  staff: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    assignStaff,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="assign-user">Staff member</Label>
          <select id="assign-user" name="userId" required className={selectClasses}>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="assign-role">Assignment role</Label>
          <select
            id="assign-role"
            name="roleLabel"
            defaultValue="moderator"
            className={selectClasses}
          >
            <option value="manager">Manager</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Assigning…" : "Assign"}
      </Button>
    </form>
  );
}

export function MilestoneControls({
  projectId,
  milestones,
  canManage,
}: {
  projectId: string;
  milestones: ProjectMilestoneRow[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    addMilestone,
    initialState,
  );

  return (
    <div className="mt-3 space-y-4">
      {milestones.length > 0 ? (
        <ul className="space-y-2">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center gap-3">
              {canManage ? (
                <form action={toggleMilestone}>
                  <input type="hidden" name="milestoneId" value={milestone.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <input
                    type="hidden"
                    name="complete"
                    value={milestone.completed_at ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    aria-label={
                      milestone.completed_at
                        ? `Mark ${milestone.title} incomplete`
                        : `Mark ${milestone.title} complete`
                    }
                  >
                    {milestone.completed_at ? (
                      <CheckCircle2
                        aria-hidden
                        className="h-5 w-5 text-success"
                      />
                    ) : (
                      <Circle aria-hidden className="h-5 w-5 text-line" />
                    )}
                  </button>
                </form>
              ) : milestone.completed_at ? (
                <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
              ) : (
                <Circle aria-hidden className="h-5 w-5 text-line" />
              )}
              <span
                className={cn(
                  "text-sm",
                  milestone.completed_at
                    ? "text-ink-muted line-through"
                    : "text-ink",
                )}
              >
                {milestone.title}
                {milestone.due_date && (
                  <span className="ml-2 text-xs text-ink-muted tnum">
                    due {formatDateUS(milestone.due_date)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">No milestones yet.</p>
      )}

      {canManage && (
        <form action={formAction} className="space-y-3">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="milestone-title">New milestone</Label>
              <Input
                id="milestone-title"
                name="title"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="milestone-due">Due date (optional)</Label>
              <Input id="milestone-due" name="dueDate" type="date" />
            </div>
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add milestone"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function CreateRequestForm({
  projectId,
  organizationId,
}: {
  projectId: string;
  organizationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createDataRequest,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="request-title">Request title</Label>
          <Input
            id="request-title"
            name="title"
            required
            maxLength={200}
            placeholder="e.g. Passport copy for the responsible party"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="request-description">Instructions (optional)</Label>
          <Input id="request-description" name="description" maxLength={2000} />
        </div>
        <div>
          <Label htmlFor="request-kind">Type</Label>
          <select id="request-kind" name="kind" className={selectClasses}>
            <option value="information">Information</option>
            <option value="document">Document</option>
          </select>
        </div>
        <div>
          <Label htmlFor="request-priority">Priority</Label>
          <select
            id="request-priority"
            name="priority"
            defaultValue="normal"
            className={selectClasses}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <Label htmlFor="request-due">Due date (optional)</Label>
          <Input id="request-due" name="dueDate" type="date" />
        </div>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send data request"}
      </Button>
    </form>
  );
}
