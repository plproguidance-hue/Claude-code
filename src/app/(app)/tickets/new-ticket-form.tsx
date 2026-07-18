"use client";

import { useActionState } from "react";

import { createTicket, type TicketActionState } from "./actions";
import { TICKET_DEPARTMENTS } from "@/lib/tickets/labels";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: TicketActionState = {};

const selectClasses =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function NewTicketForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createTicket,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Open a ticket</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {organizations.length === 1 ? (
          <input
            type="hidden"
            name="organizationId"
            value={organizations[0]?.id}
          />
        ) : (
          <div>
            <Label htmlFor="tk-org">Organization</Label>
            <select id="tk-org" name="organizationId" required className={selectClasses}>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tk-dept">Department</Label>
            <select
              id="tk-dept"
              name="department"
              defaultValue="general_support"
              className={selectClasses}
            >
              {Object.entries(TICKET_DEPARTMENTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tk-priority">Priority</Label>
            <select
              id="tk-priority"
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
        </div>
        <div>
          <Label htmlFor="tk-subject">Subject</Label>
          <Input id="tk-subject" name="subject" required maxLength={200} />
        </div>
        <div>
          <Label htmlFor="tk-body">How can we help?</Label>
          <textarea
            id="tk-body"
            name="body"
            rows={4}
            required
            maxLength={10000}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Opening…" : "Open ticket"}
        </Button>
      </form>
    </Card>
  );
}
