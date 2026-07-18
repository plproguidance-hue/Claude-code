"use client";

import { useActionState } from "react";
import { X } from "lucide-react";

import type { Role } from "@/lib/auth/permissions";
import {
  addStaffAssignment,
  changeUserRole,
  removeStaffAssignment,
  type StaffActionState,
} from "./actions";
import { Button } from "@/components/ui/button";

const initialState: StaffActionState = {};

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const [state, formAction, pending] = useActionState(
    changeUserRole,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Change role
      </label>
      <select
        id={`role-${userId}`}
        name="role"
        defaultValue={currentRole}
        className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
      >
        <option value="client">Client</option>
        <option value="moderator">Moderator</option>
        <option value="manager">Manager</option>
        <option value="administrator">Administrator</option>
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        Apply
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AssignmentForm({
  userId,
  organizations,
}: {
  userId: string;
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    addStaffAssignment,
    initialState,
  );

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`assign-org-${userId}`}>
        Assign organization
      </label>
      <select
        id={`assign-org-${userId}`}
        name="organizationId"
        className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        + Assign
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RemoveAssignmentButton({
  assignmentId,
}: {
  assignmentId: string;
}) {
  return (
    <form action={removeStaffAssignment}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button
        type="submit"
        aria-label="Remove assignment"
        className="text-ink-muted hover:text-danger"
      >
        <X aria-hidden className="h-3 w-3" />
      </button>
    </form>
  );
}
