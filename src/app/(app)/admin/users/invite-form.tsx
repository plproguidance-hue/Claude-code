"use client";

import { useActionState } from "react";

import { createInvitation, type InviteActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: InviteActionState = {};

export function InviteForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createInvitation,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Invite a user</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Invitations can pre-approve the account (per invitation policy) and,
        for clients, link it to an organization on signup. The link is shown
        once — only its hash is stored.
      </p>

      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && (
          <Alert tone="success">
            {state.message}
            {state.inviteUrl && (
              <code className="mt-2 block break-all rounded bg-line/50 px-2 py-1 text-xs text-ink">
                {state.inviteUrl}
              </code>
            )}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="client@company.com"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              name="role"
              required
              defaultValue="client"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="client">Client</option>
              <option value="moderator">Moderator</option>
              <option value="manager">Manager</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="invite-org">
              Organization (required for clients)
            </Label>
            <select
              id="invite-org"
              name="organizationId"
              defaultValue=""
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">No organization (staff invite)</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="autoApprove" defaultChecked />
          Pre-approve this account (skip the registration queue)
        </label>

        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invitation"}
        </Button>
      </form>
    </Card>
  );
}
