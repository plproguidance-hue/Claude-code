"use client";

import { useActionState } from "react";

import { sendAnnouncement, type ContentActionState } from "../content/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: ContentActionState = {};

export function AnnouncementComposer({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    sendAnnouncement,
    initialState,
  );

  return (
    <Card>
      <CardTitle>New announcement</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <div>
          <Label htmlFor="an-org">Audience (organization members)</Label>
          <select
            id="an-org"
            name="organizationId"
            required
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="an-title">Title</Label>
          <Input id="an-title" name="title" required maxLength={200} />
        </div>
        <div>
          <Label htmlFor="an-body">Message (optional)</Label>
          <textarea
            id="an-body"
            name="body"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <Label htmlFor="an-link">Internal link (optional, e.g. /invoices)</Label>
          <Input id="an-link" name="link" maxLength={200} placeholder="/..." />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send announcement"}
        </Button>
      </form>
    </Card>
  );
}
