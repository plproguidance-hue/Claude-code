"use client";

import { useActionState } from "react";

import { createInvoice, type BillingActionState } from "../billing/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: BillingActionState = {};

export function NewInvoiceForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createInvoice,
    initialState,
  );

  return (
    <Card>
      <CardTitle>New draft invoice</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ni-org">Client organization</Label>
            <select
              id="ni-org"
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
            <Label htmlFor="ni-notes">Notes (optional)</Label>
            <Input id="ni-notes" name="notes" maxLength={2000} />
          </div>
        </div>
        <div>
          <Label htmlFor="ni-items">
            Line items — one per line: label | qty | USD price
          </Label>
          <textarea
            id="ni-items"
            name="items"
            rows={4}
            required
            placeholder={"Registered Agent (annual) | 1 | 99\nVirtual Address | 1 | 149"}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create draft invoice"}
        </Button>
      </form>
    </Card>
  );
}
